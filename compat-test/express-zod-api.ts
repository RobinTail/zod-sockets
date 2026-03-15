import { createConfig, createServer } from "express-zod-api";
import { Server } from "socket.io";
import { attachSockets, createSimpleConfig } from "zod-sockets";

const serverConfig = createConfig({ http: { listen: 8090 }, cors: false });

const { servers, logger } = await createServer(serverConfig, {});

const socketsConfig = createSimpleConfig();

const io = new Server();
await attachSockets({
  target: servers.pop()!,
  config: socketsConfig,
  actions: [],
  io,
  logger,
});
