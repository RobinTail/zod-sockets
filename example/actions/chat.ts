import { z } from "zod";
import { Metadata } from "../config";
import { actionsFactory } from "../factories";

export const onChat = actionsFactory.build({
  event: "chat",
  input: z.tuple([z.string()]),
  handler: async ({ input: [message], client, logger }) => {
    try {
      await client.broadcast("chat", message, { from: client.id });
      client.setData<Metadata>({
        msgCount: (client.getData<Metadata>().msgCount || 0) + 1,
      });
    } catch (error) {
      logger.error("Failed to broadcast", error);
    }
  },
});
