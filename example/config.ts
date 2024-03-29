import { z } from "zod";
import { createSimpleConfig } from "../src";

export const config = createSimpleConfig({
  emission: {
    time: {
      schema: z.tuple([
        z
          .date()
          .transform((date) => date.toISOString())
          .describe("current ISO time"),
      ]),
    },
    chat: {
      schema: z.tuple([
        z.string().describe("message"),
        z
          .object({ from: z.string().describe("the ID of author") })
          .describe("extra info"),
      ]),
    },
    rooms: {
      schema: z.tuple([z.string().array().describe("room IDs")]),
    },
  },
  hooks: {
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
  metadata: z.object({
    // Number of messages sent using the chat event
    msgCount: z.number().int(),
  }),
});

// Uncomment these lines to set the type of logger used:
/*
declare module "zod-sockets" {
  interface LoggerOverrides extends winston.Logger {}
}
*/
