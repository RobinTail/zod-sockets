import { createConfig, createServer } from "express-zod-api";
import { Server } from "socket.io";
import { Config, attachSockets } from "zod-sockets";

const serverConfig = createConfig({
  server: { listen: 8090 },
  cors: false,
  logger: { level: "debug", color: true },
});

const { httpServer, logger } = await createServer(serverConfig, {});

const socketsConfig = new Config({
  logger,
  timeout: 2000,
});

const io = new Server();
await attachSockets({
  target: httpServer,
  config: socketsConfig,
  actions: [],
  io,
});
