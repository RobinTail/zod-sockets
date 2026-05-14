import { z } from "zod";
import { subscribersRoom } from "../config.ts";
import { actionsFactory } from "../factories.ts";

/** @desc The action demonstrates no acknowledgement and the client distribution abilities */
export const onUnsubscribe = actionsFactory.build({
  event: "unsubscribe",
  input: z.tuple([]).rest(z.unknown().describe("Does not matter")),
  handler: async ({ logger, client }) => {
    logger.info(`Unsubscribed ${client.id}`);
    await client.leave(subscribersRoom);
  },
});
