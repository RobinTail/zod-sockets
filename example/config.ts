import { z } from "zod";
import { createConfig } from "../src";

/** @desc Client metadata */
export interface Metadata {
  /** @desc Number of messages sent using the chat event */
  msgCount: number;
}

export const config = createConfig({
  timeout: 2000,
  logger: console,
  namespaces: {
    "/": {
      emission: {
        time: {
          schema: z.tuple([z.date().transform((date) => date.toISOString())]),
        },
        chat: {
          schema: z.tuple([z.string(), z.object({ from: z.string() })]),
        },
        rooms: {
          schema: z.tuple([z.string().array()]),
        },
      },
      onConnection: async ({ client }) => {
        await client.broadcast("chat", `${client.id} entered the chat`, {
          from: client.id,
        });
      },
      onStartup: async ({ all }) => {
        setInterval(() => {
          all.broadcast("rooms", all.getRooms());
        }, 30000);
      },
    },
  },
});

// Uncomment these lines to set the type of logger used:
/*
declare module "zod-sockets" {
  interface LoggerOverrides extends winston.Logger {}
}
*/
