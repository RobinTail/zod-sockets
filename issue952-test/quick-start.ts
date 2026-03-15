import { createSimpleConfig } from "zod-sockets";

export const config = createSimpleConfig(); // shorthand for root namespace only

import { ActionsFactory } from "zod-sockets";

export const actionsFactory = new ActionsFactory(config);

import { z } from "zod";

export const onPing = actionsFactory.build({
  event: "ping",
  input: z.tuple([]).rest(z.unknown()),
  output: z.tuple([z.literal("pong")]).rest(z.unknown()),
  handler: async ({ input }) => ["pong", ...input] as const,
});

import http from "node:http";
import { Server } from "socket.io";
import { attachSockets } from "zod-sockets";

attachSockets({
  /** @see https://socket.io/docs/v4/server-options/ */
  io: new Server(),
  config: config,
  actions: [onPing],
  target: http.createServer().listen(8090),
});