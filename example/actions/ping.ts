import { z } from "zod/v4";
import { actionsFactory } from "../factories";

/** @desc The action demonstrates acknowledgements by replying "pong" to "ping" event with an echo of payload */
export const onPing = actionsFactory.build({
  event: "ping",
  input: z
    .tuple([])
    .rest(z.unknown().describe("Anything"))
    .meta({ examples: [["something"]] }),
  output: z
    .tuple([z.literal("pong").describe("literally")])
    .rest(z.unknown().describe("echo"))
    .meta({ examples: [["pong", "something"]] }),
  handler: async ({ input }) => ["pong", ...input] as const,
});
