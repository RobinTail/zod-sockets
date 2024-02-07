import { z } from "zod";
import { createConfig } from "../src";

export const config = createConfig({
  timeout: 2000,
  logger: console,
  emission: {
    time: {
      schema: z.tuple([z.date().transform((date) => date.toISOString())]),
    },
    chat: {
      schema: z.tuple([z.string()]),
    },
  },
});

// Uncomment these lines to set the type of logger used:
/*
declare module "zod-sockets" {
  interface LoggerOverrides extends winston.Logger {}
}
*/
