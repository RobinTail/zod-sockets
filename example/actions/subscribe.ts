import { z } from "zod/v4";
import { subscribersRoom } from "../config";
import { actionsFactory } from "../factories";

/** @desc The action demonstrates no acknowledgement and the client distribution abilities */
export const onSubscribe = actionsFactory.build({
  event: "subscribe",
  input: z.tuple([]).rest(z.unknown().describe("Does not matter")),
  handler: async ({ logger, client }) => {
    logger.info(`Subscribed ${client.id}`);
    await client.join(subscribersRoom);
  },
});
