import {
  createServer,
  createConfig as createServerConfig,
} from "express-zod-api";
import { Server } from "socket.io";
import { createConfig as createSocketsConfig } from "zod-sockets";
import { attachSockets } from "../../src";

const serverConfig = createServerConfig({
  server: { listen: 8090 },
  cors: false,
  logger: { level: "debug", color: true },
});

const { httpServer, logger } = await createServer(serverConfig, {});

const socketsConfig = createSocketsConfig({
  logger,
  timeout: 2000,
  emission: {},
});

const io = new Server();
await attachSockets({
  target: httpServer,
  config: socketsConfig,
  actions: {},
  io,
});
