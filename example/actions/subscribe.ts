import { z } from "zod";
import { actionsFactory } from "../factories";

/** @desc The action demonstrates no acknowledgement and constraints on emission awareness */
export const onSubscribe = actionsFactory.build({
  event: "subscribe",
  input: z.tuple([]).rest(z.unknown().describe("Does not matter")),
  handler: async ({ logger, client }) => {
    logger.info("Subscribed");
    while (true) {
      try {
        await client.emit("time", new Date()); // <— payload type constraints
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            clearTimeout(timer);
            if (!client.isConnected()) {
              reject("Disconnected");
            }
            resolve();
          }, 1000);
        });
      } catch (error) {
        logger.error("Unsubscribed due to", error);
        break;
      }
    }
  },
});
