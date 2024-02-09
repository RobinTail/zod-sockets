import { z } from "zod";
import { actionsFactory } from "../factories";

export const onChat = actionsFactory.build({
  input: z.tuple([z.string()]),
  handler: async ({ input: [message], client, all, logger }) => {
    try {
      await all.broadcast("chat", message, { from: client.id });
    } catch (error) {
      logger.error("Failed to broadcast", error);
    }
  },
});
