import { z } from "zod";
import { createSocketsConfig } from "../src";

export const socketsConfig = createSocketsConfig({
  timeout: 2000,
  emission: {
    time: {
      schema: z.tuple([z.date().transform((date) => date.toISOString())]),
    },
  },
});

// Uncomment these lines to set the type of logger used:
/*
declare module "zod-sockets" {
  interface LoggerOverrides extends winston.Logger {}
}
*/
