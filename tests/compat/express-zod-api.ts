import { createConfig, createServer } from "express-zod-api";
import { Server } from "socket.io";
import { attachSockets, createSimpleConfig } from "zod-sockets";

const serverConfig = createConfig({
  server: { listen: 8090 },
  cors: false,
  logger: { level: "debug", color: true },
});

const { httpServer, logger } = await createServer(serverConfig, {});

const socketsConfig = createSimpleConfig({ logger });

const io = new Server();
await attachSockets({
  target: httpServer,
  config: socketsConfig,
  actions: [],
  io,
});
