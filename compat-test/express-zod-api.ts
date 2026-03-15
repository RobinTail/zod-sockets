import { createConfig, createServer } from "express-zod-api";
import { Server } from "socket.io";
import { attachSockets, createSimpleConfig } from "zod-sockets";
import { givePort } from "../tools/ports";

const serverConfig = createConfig({
  http: { listen: givePort("compat") },
  cors: false,
});

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
