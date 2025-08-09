import { z } from "zod";
import { actionsFactory } from "../factories";

/** @desc The action demonstrates acknowledgements by replying "pong" to "ping" event with an echo of payload */
export const onPing = actionsFactory.build({
  event: "ping",
  input: z
    .tuple([])
    .rest(
      z.unknown().meta({ description: "Anything", examples: ["something"] }),
    ),
  output: z
    .tuple([
      z.literal("pong").meta({ description: "literally", examples: ["pong"] }),
    ])
    .rest(z.unknown().meta({ description: "echo", examples: ["something"] })),
  handler: async ({ input }) => ["pong", ...input] as const,
});
