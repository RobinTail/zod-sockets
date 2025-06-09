import { z } from "zod/v4";
import { createSimpleConfig, InputValidationError } from "../src";

/**
 * @see onSubscribe
 * @see onUnsubscribe
 * */
export const subscribersRoom = "subscribers";

// Demo of circular/recursive schema in Zod 4
const feature = z.object({
  name: z.string(),
  get features() {
    return feature.array().optional();
  },
});

export const config = createSimpleConfig({
  emission: {
    time: {
      schema: z.tuple([
        z
          .date()
          .transform((date) => date.toISOString())
          .meta({
            description: "current ISO time",
            examples: ["2024-03-28T21:13:15.084Z"],
          }),
      ]),
    },
    chat: {
      schema: z.tuple([
        z.string().meta({ description: "message", examples: ["Hello there!"] }),
        z
          .object({
            from: z.string().describe("the ID of author"),
            features: feature.array(),
          })
          .meta({
            description: "extra info",
            examples: [{ from: "123abc", features: [{ name: "visitor" }] }],
          }),
      ]),
    },
    rooms: {
      schema: z.tuple([
        z
          .string()
          .array()
          .meta({
            description: "room IDs",
            examples: [
              ["room1", "room2"],
              ["room3", "room4", "room5"],
            ],
          }),
      ]),
    },
    error: {
      schema: z.tuple([
        z
          .string()
          .meta({ description: "name", examples: ["InputValidationError"] }),
        z
          .string()
          .meta({ description: "message", examples: ["[1]: Required"] }),
      ]),
    },
  },
  hooks: {
    onConnection: async ({ client }) => {
      await client.broadcast("chat", `${client.id} entered the chat`, {
        from: client.id,
        features: client.getData().features || [],
      });
    },
    onStartup: async ({ all, withRooms }) => {
      setInterval(() => {
        all.broadcast("rooms", all.getRooms()); // <— payload type constraints
      }, 30000);
      setInterval(() => {
        withRooms(subscribersRoom).broadcast("time", new Date()); // <— payload type constraints
      }, 1000);
    },
    onError: async ({ error, client, logger, event }) => {
      logger.error(event ? `${event} handling error` : "Error", error);
      if (error instanceof InputValidationError && client) {
        try {
          await client.emit("error", error.name, error.message);
        } catch {} // no errors inside this hook
      }
    },
  },
  metadata: z.object({
    // Number of messages sent using the chat event
    msgCount: z.number().int(),
    features: feature.array(),
  }),
});

// Uncomment these lines to set the type of logger used:
/*
declare module "zod-sockets" {
  interface LoggerOverrides extends winston.Logger {}
}
*/
