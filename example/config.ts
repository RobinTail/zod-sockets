import { z } from "zod";
import { createConfig } from "../src";

// @todo remove
export interface Metadata {
  msgCount: number;
}

export const config = createConfig({
  timeout: 2000,
  logger: console,
  metadata: z.object({
    msgCount: z
      .number()
      .describe("Number of messages sent using the chat event"),
  }),
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
});

// Uncomment these lines to set the type of logger used:
/*
declare module "zod-sockets" {
  interface LoggerOverrides extends winston.Logger {}
}
*/
