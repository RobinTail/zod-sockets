import { SchemaObject } from "openapi3-ts/oas31";
import { config as exampleConfig } from "../example/config";
import { actions } from "../example/actions";
import { ActionsFactory } from "./actions-factory";
import { createConfig } from "./config";
import { Documentation } from "./documentation";
import { z } from "zod";
import { describe, expect, test, vi } from "vitest";
import { protocol } from "engine.io";

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

    test("EIO handshake should match the Engine.IO protocol version", () => {
      const doc = new Documentation({
        actions: [],
        config: sampleConfig,
        version: "1.2.3",
        title: "Example API",
        servers: {
          example: { url: "https://example.com/socket.io" },
        },
      }).getSpec();
      expect(
        (
          (doc.channels["/"].bindings?.["socket.io"]?.query as SchemaObject)
            .properties?.EIO as SchemaObject
        ).enum,
      ).toEqual([protocol.toString()]);
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
            handler: async () => [{ five: 5, six: "six" }],
          }),
        ],
        version: "3.4.5",
        title: "Testing Intersection and And types",
      }).getSpecAsYaml();
      expect(spec).toMatchSnapshot();
    });

    test("should generate the correct schema for union type", () => {
      const spec = new Documentation({
        config: sampleConfig,
        actions: [
          factory.build({
            event: "name",
            input: z.tuple([
              z.union([
                z.object({
                  one: z.string(),
                  two: z.number().int().positive(),
                }),
                z.object({
                  two: z.number().int().negative(),
                  three: z.string(),
                }),
              ]),
            ]),
            output: z.tuple([z.string().or(z.number().int().positive())]),
            handler: async () => [554],
          }),
        ],
        version: "3.4.5",
        title: "Testing Union and Or Types",
      }).getSpecAsYaml();
      expect(spec).toMatchSnapshot();
    });

    test("should generate the correct schema for discriminated union type", () => {
      const spec = new Documentation({
        config: sampleConfig,
        actions: [
          factory.build({
            event: "test",
            input: z.tuple([
              z.discriminatedUnion("type", [
                z.object({ type: z.literal("a"), a: z.string() }),
                z.object({ type: z.literal("b"), b: z.string() }),
              ]),
            ]),
            output: z.tuple([
              z.discriminatedUnion("status", [
                z.object({ status: z.literal("success"), data: z.any() }),
                z.object({
                  status: z.literal("error"),
                  error: z.object({ message: z.string() }),
                }),
              ]),
            ]),
            handler: async () => [
              {
                status: "success" as const,
                data: "test",
              },
            ],
          }),
        ],
        version: "3.4.5",
        title: "Testing Discriminated Union Type",
      }).getSpecAsYaml();
      expect(spec).toMatchSnapshot();
    });

    test("should handle transformation schema in output", () => {
      const spec = new Documentation({
        config: sampleConfig,
        actions: [
          factory.build({
            event: "test",
            input: z.tuple([
              z.object({
                one: z.string(),
                two: z.number().int().positive(),
              }),
            ]),
            output: z.tuple([z.string().transform((str) => str.length)]),
            handler: async () => ["test"],
          }),
        ],
        version: "3.4.5",
        title: "Testing Transformation in response schema",
      }).getSpecAsYaml();
      expect(spec).toMatchSnapshot();
    });

    test("should handle bigint, boolean, date, null and readonly", () => {
      const spec = new Documentation({
        config: sampleConfig,
        actions: [
          factory.build({
            event: "test",
            input: z.tuple([
              z.object({
                bigint: z.bigint(),
                boolean: z.boolean().readonly(),
                date: z.date(),
              }),
            ]),
            output: z.tuple([z.null(), z.date()]),
            handler: async () => [null, new Date("2021-12-31")],
          }),
        ],
        version: "3.4.5",
        title: "Testing additional types",
      }).getSpecAsYaml();
      expect(spec).toMatchSnapshot();
    });

    test("should handle record", () => {
      const spec = new Documentation({
        config: sampleConfig,
        actions: [
          factory.build({
            event: "test",
            input: z.tuple([]),
            output: z.tuple([
              z.record(z.number().int()),
              z.record(z.string().regex(/[A-Z]+/), z.boolean()),
              z.record(z.number().int(), z.boolean()),
              z.record(z.literal("only"), z.boolean()),
              z.record(
                z.literal("option1").or(z.literal("option2")),
                z.boolean(),
              ),
              z.record(z.enum(["option1", "option2"]), z.boolean()),
            ]),
            handler: vi.fn<any>(),
          }),
        ],
        version: "3.4.5",
        title: "Testing record",
      }).getSpecAsYaml();
      expect(spec).toMatchSnapshot();
    });

    test("should handle type any", () => {
      const spec = new Documentation({
        config: sampleConfig,
        actions: [
          factory.build({
            event: "test",
            input: z.tuple([z.any()]),
            output: z.tuple([z.any()]),
            handler: vi.fn<any>(),
          }),
        ],
        version: "3.4.5",
        title: "Testing type any",
      }).getSpecAsYaml();
      expect(spec).toMatchSnapshot();
    });

    test("should handle different number types", () => {
      const spec = new Documentation({
        config: sampleConfig,
        actions: [
          factory.build({
            event: "test",
            input: z.tuple([
              z.number(),
              z.number().positive(),
              z.number().negative(),
              z.number().min(-0.5).max(0.5),
              z.number().int(),
              z.number().int().positive(),
              z.number().int().negative(),
              z.number().int().min(-100).max(100),
              z.number().int().nonnegative().nonpositive().optional(),
            ]),
            output: z.tuple([z.bigint()]),
            handler: vi.fn<any>(),
          }),
        ],
        version: "3.4.5",
        title: "Testing numbers",
      }).getSpecAsYaml();
      expect(spec).toMatchSnapshot();
    });

    test("should handle different string types", () => {
      const spec = new Documentation({
        config: sampleConfig,
        actions: [
          factory.build({
            event: "test",
            input: z.tuple([
              z.string(),
              z.string().min(1),
              z.string().max(15),
              z.string().min(2).max(3),
              z.string().email(),
              z.string().uuid(),
              z.string().cuid(),
              z.string().cuid2(),
              z.string().ulid(),
              z.string().ip(),
              z.string().emoji(),
              z.string().url(),
              z.string().regex(/\d+/),
              z
                .string()
                .min(1)
                .email()
                .regex(/.*@example\.com/is)
                .max(90),
            ]),
            output: z.tuple([z.string().min(1)]),
            handler: vi.fn<any>(),
          }),
        ],
        version: "3.4.5",
        title: "Testing strings",
      }).getSpecAsYaml();
      expect(spec).toMatchSnapshot();
    });

    test.each([
      z.tuple([z.boolean()]),
      z.tuple([z.string(), z.string().nullable()]),
      z.tuple([z.boolean(), z.string(), z.number().int().positive()]),
      z.tuple([]),
    ])("should handle tuples %#", (input) => {
      const spec = new Documentation({
        config: sampleConfig,
        actions: [
          factory.build({
            event: "test",
            input,
            output: z.tuple([]),
            handler: async () => [],
          }),
        ],
        version: "3.4.5",
        title: "Testing tuples",
      }).getSpecAsYaml();
      expect(spec).toMatchSnapshot();
    });

    test("should handle enum types", () => {
      const spec = new Documentation({
        config: sampleConfig,
        actions: [
          factory.build({
            event: "test",
            input: z.tuple([z.enum(["ABC", "DEF"])]),
            output: z.tuple([z.nativeEnum({ FEG: 1, XYZ: 2 })]),
            handler: async () => [1],
          }),
        ],
        version: "3.4.5",
        title: "Testing enums",
      }).getSpecAsYaml();
      expect(spec).toMatchSnapshot();
    });

    test("should handle z.preprocess()", () => {
      const string = z.preprocess((arg) => String(arg), z.string());
      const number = z.preprocess(
        (arg) => parseInt(String(arg), 16),
        z.number().int().nonnegative(),
      );
      const boolean = z.preprocess((arg) => !!arg, z.boolean());
      const spec = new Documentation({
        config: sampleConfig,
        actions: [
          factory.build({
            event: "test",
            input: z.tuple([string, number]),
            output: z.tuple([boolean]),
            handler: async () => [[]],
          }),
        ],
        version: "3.4.5",
        title: "Testing z.preprocess()",
      }).getSpecAsYaml();
      expect(spec).toMatchSnapshot();
      expect(string.parse(123)).toBe("123");
      expect(number.parse("0xFF")).toBe(255);
      expect(boolean.parse([])).toBe(true);
      expect(boolean.parse("")).toBe(false);
      expect(boolean.parse(null)).toBe(false);
    });

    test.each([
      z.undefined(),
      z.map(z.any(), z.any()),
      z.function(),
      z.promise(z.any()),
      z.never(),
      z.void(),
    ])("should throw on unsupported types %#", (zodType) => {
      expect(
        () =>
          new Documentation({
            config: sampleConfig,
            actions: [
              factory.build({
                event: "test",
                input: z.tuple([zodType]),
                output: z.tuple([]),
                handler: async () => [],
              }),
            ],
            version: "3.4.5",
            title: "Testing unsupported types",
          }),
      ).toThrow(`Zod type ${zodType._def.typeName} is unsupported.`);
    });
  });
});
