import { z } from "zod";
import { actionsFactory } from "../factories";

/** @desc The action demonstrates no acknowledgement and constraints on emission awareness */
export const onSubscribe = actionsFactory.build({
  input: z.tuple([]).rest(z.unknown()),
  handler: async ({ logger, emit, isConnected }) => {
    logger.info("Subscribed");
    while (true) {
      try {
        emit("time", new Date()); // <— payload type constraints
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            clearTimeout(timer);
            if (!isConnected()) {
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
