import http from "node:http";
import { Server } from "socket.io";
import { io as ioClient } from "socket.io-client";
import { z } from "zod";
import { attachSockets, Config, ActionsFactory } from "../../src";
import { promisify } from "node:util";

const port = 8999;

/**
 * withRooms().getClients() returns an empty array in action handlers even after clients join rooms in the onConnection
 * hook. Broadcasts via withRooms().broadcast() also fail silently. ClientContext.withRooms uses socket as the subject,
 * limiting queries to socket-local scope instead of namespace-wide scope.
 * @link https://github.com/RobinTail/zod-sockets/pull/590
 * @author https://github.com/simwai
 */
describe("Issue #590", () => {
  describe("attachSockets() with real Socket.IO", () => {
    test("should query and broadcast to rooms joined in onConnection", async () => {
      const httpServer = http.createServer();
      const io = new Server();

      let clientsInRoom = 0;

      const config = new Config().addNamespace({
        path: "/chat",
        emission: {
          testBroadcast: { schema: z.tuple([z.string()]) },
        },
        hooks: {
          onConnection: async ({ client }) => await client.join("testRoom"),
        },
        metadata: z.object({}),
      });

      const actionsFactory = new ActionsFactory(config);

      const testAction = actionsFactory.build({
        ns: "/chat",
        event: "testQuery",
        input: z.tuple([]),
        async handler({ withRooms }) {
          const clients = await withRooms("testRoom").getClients();
          clientsInRoom = clients.length;
          await withRooms("testRoom").broadcast("testBroadcast", "hello");
        },
      });

      await attachSockets({
        io,
        config,
        actions: [testAction],
        target: httpServer,
      });

      await promisify(httpServer.listen.bind(httpServer, port))();

      // connect client:
      const clientSocket = ioClient(`http://localhost:${port}/chat`, {
        transports: ["websocket"],
      });

      await promisify(clientSocket.on.bind(clientSocket, "connect"))();

      // listen for broadcast:
      const broadcastReceived = new Promise<string>((resolve) => {
        clientSocket.on("testBroadcast", resolve);
      });

      // trigger action:
      clientSocket.emit("testQuery");

      const receivedBroadcast = await vi.waitFor(() => broadcastReceived, {
        timeout: 1000,
      });

      // withRooms().getClients() should find client:
      expect(clientsInRoom).toBe(1);

      // withRooms().broadcast() should reach client:
      expect(receivedBroadcast).toBe("hello");

      clientSocket.disconnect();
      await promisify(io.close.bind(io))();
      if (httpServer.listening)
        await promisify(httpServer.close.bind(httpServer))();
    });
  });
});
