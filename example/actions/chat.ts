import { z } from "zod";
import { actionsFactory } from "../factories";

export const onChat = actionsFactory.build({
  event: "chat",
  input: z.tuple([
    z.string().meta({ description: "message", examples: ["Hello there"] }),
  ]),
  handler: async ({ input: [message], client, logger }) => {
    try {
      await client.broadcast("chat", message, {
        from: client.id,
        features: client.getData().features || [],
      });
      client.setData({
        msgCount: (client.getData().msgCount || 0) + 1,
        features: [
          { name: "visitor" },
          { name: "groups", features: [{ name: "g/cats" }] },
        ],
      });
    } catch (error) {
      logger.error("Failed to broadcast", error);
    }
  },
});
