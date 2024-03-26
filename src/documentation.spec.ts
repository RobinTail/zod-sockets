import { config as exampleConfig } from "../example/config";
import { actions } from "../example/actions";
import { ActionsFactory } from "./actions-factory";
import { createConfig } from "./config";
import { Documentation } from "./documentation";
import { z } from "zod";
import { describe, expect, test } from "vitest";

describe("Documentation", () => {
  const sampleConfig = createConfig();
  const factory = new ActionsFactory(sampleConfig);

  describe("Basic cases", () => {
    test("should generate the correct schema of the example", () => {
      const spec = new Documentation({
        actions,
        config: exampleConfig,
        version: "1.2.3",
        title: "Example API",
        servers: {
          example: { url: "https://example.com/socket.io" },
        },
      }).getSpecAsYaml();
      expect(spec).toMatchSnapshot();
    });

    test("should generate the correct schema for complex types", () => {
      const literalValue = "something" as const;
      const spec = new Documentation({
        config: sampleConfig,
        actions: [
          factory.build({
            event: "test",
            input: z.tuple([
              z.array(z.number().int().positive()).min(1).max(3),
              z.array(z.boolean()),
              z.string().transform((str) => str.length),
            ]),
            output: z.tuple([z.literal(literalValue), z.number()]),
            handler: async ({ input }) => [literalValue, input[2]],
          }),
        ],
        version: "3.4.5",
        title: "Testing Complex Types",
      }).getSpecAsYaml();
      expect(spec).toMatchSnapshot();
    });

    test("should generate the correct schema for nullable and optional types", () => {
      const spec = new Documentation({
        config: sampleConfig,
        actions: [
          factory.build({
            event: "test",
            input: z.tuple([
              z.string().optional(),
              z.string().optional().default("test"),
              z.boolean().nullish(),
              z.number().int().positive().nullish().default(123),
            ]),
            output: z.tuple([z.string().nullable()]),
            handler: async () => [null],
          }),
        ],
        version: "3.4.5",
        title: "Testing Nullable and Optional Types",
      }).getSpecAsYaml();
      expect(spec).toMatchSnapshot();
    });

    /*
    test("should generate the correct schema for intersection type", () => {
      const spec = new Documentation({
        config: sampleConfig,
        actions: [
          factory.build({
            event: "test",
            input: z.tuple([
              z.intersection(
                z.object({
                  one: z.string(),
                }),
                z.object({
                  two: z.string(),
                }),
              ),
            ]),
            output: z.tuple([
              z
                .object({
                  five: z.number().int().gte(0),
                })
                .and(
                  z.object({
                    six: z.string(),
                  }),
                ),
            ]),
            handler: async () => ({ five: 5, six: "six" }),
          }),
        ],
        version: "3.4.5",
        title: "Testing Intersection and And types",
      }).getSpecAsYaml();
      expect(spec).toMatchSnapshot();
    });*/
  });
});
