import http from "node:http";
import { Server } from "socket.io";
import { io as ioClient } from "socket.io-client";
import { z } from "zod";
import { attachSockets } from "./attach";
import { Config } from "./config";
import { ActionsFactory } from "./actions-factory";

describe("Attach", () => {
  describe("attachSockets() with real Socket.IO", () => {
    let httpServer: http.Server;
    let io: Server;
    let clientSocket: ReturnType<typeof ioClient> | undefined;

    afterEach(async () => {
      if (clientSocket) {
        clientSocket.disconnect();
      }
      if (io) {
        await new Promise<void>((resolve) => io.close(() => resolve()));
      }
      if (httpServer) {
        await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      }
    });

    test("should query and broadcast to rooms joined in onConnection", async () => {
      httpServer = http.createServer();
      io = new Server();
      const port = 10000 + Math.floor(Math.random() * 1000);

      let clientsInRoom = 0;
      let receivedBroadcast = "";

      const config = new Config().addNamespace({
        path: "/chat",
        emission: {
          testBroadcast: { schema: z.tuple([z.string()]) },
        },
        hooks: {
          async onConnection({ client }) {
            await client.join("testRoom");
          },
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

      await new Promise<void>((resolve) => {
        httpServer.listen(port, () => resolve());
      });

      // connect client:
      clientSocket = ioClient(`http://localhost:${port}/chat`, {
        transports: ["websocket"],
      });

      await new Promise<void>((resolve) => {
        clientSocket!.on("connect", () => resolve());
      });

      // listen for broadcast:
      const broadcastReceived = new Promise<string>((resolve) => {
        clientSocket!.on("testBroadcast", (msg: string) => resolve(msg));
      });

      // trigger action:
      clientSocket.emit("testQuery");

      receivedBroadcast = await Promise.race([
        broadcastReceived,
        new Promise<string>((resolve) => setTimeout(() => resolve(""), 1000)),
      ]);

      // withRooms().getClients() should find client:
      expect(clientsInRoom).toBe(1);

      // withRooms().broadcast() should reach client:
      expect(receivedBroadcast).toBe("hello");
    }, 15000);
  });
});
