import { z } from "zod";
import { actionsFactory } from "../factories";

export const onChat = actionsFactory.build({
  input: z.tuple([z.string()]),
  handler: async ({ input: [message], socketId, broadcast, logger }) => {
    try {
      broadcast("chat", message, { from: socketId });
    } catch (error) {
      logger.error("Failed to broadcast", error);
    }
  },
});
