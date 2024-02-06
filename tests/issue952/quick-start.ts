import { createConfig } from "zod-sockets";

export const config = createConfig({
  timeout: 2000,
  emission: {},
});

import { ActionsFactory } from "zod-sockets";

export const actionsFactory = new ActionsFactory(config);

import { z } from "zod";

export const onPing = actionsFactory.build({
  input: z.tuple([]).rest(z.unknown()),
  output: z.tuple([z.literal("pong")]).rest(z.unknown()),
  handler: async ({ input }) => ["pong" as export const, ...input],
});

import http from "node:http";
import {Server} from "socket.io"
import { attachSockets } from "zod-sockets";

export const target = new http.Server().listen(8090);
attachSockets({
  io: new Server(),
  config: config,
  target,
  actions: { ping: onPing },
  logger: console,
});