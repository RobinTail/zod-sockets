import { createConfig, createServer } from "express-zod-api";
import { Server } from "socket.io";
import { attachSockets, createSimpleConfig } from "zod-sockets";
import { Integration } from "zod-sockets/integration";
import { givePort } from "../tools/ports.ts";

const serverConfig = createConfig({
  http: { listen: givePort("compat") },
  cors: false,
});

const { servers, logger } = createServer(serverConfig, {});

const socketsConfig = createSimpleConfig();

logger.info(
  "Integration sample",
  (
    await Integration.create({
      config: socketsConfig,
      actions: [],
    })
  ).print(),
);

const io = new Server();
await attachSockets({
  target: servers.pop()!,
  config: socketsConfig,
  actions: [],
  io,
  logger,
});
