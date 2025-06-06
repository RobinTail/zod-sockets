import { z } from "zod/v4";
import { actionsFactory } from "../factories";

export const onChat = actionsFactory
  .build({
    event: "chat",
    input: z.tuple([z.string().describe("message")]),
    handler: async ({ input: [message], client, logger }) => {
      try {
        await client.broadcast("chat", message, { from: client.id });
        client.setData({
          msgCount: (client.getData().msgCount || 0) + 1,
        });
      } catch (error) {
        logger.error("Failed to broadcast", error);
      }
    },
  })
  .example("input", ["Hello there"]);
