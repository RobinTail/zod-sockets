import { SchemaObject } from "./async-api/model";
import { config as exampleConfig } from "../example/config";
import { actions } from "../example/actions";
import { ActionsFactory } from "./actions-factory";
import { Config, createSimpleConfig } from "./config";
import { Documentation } from "./documentation";
import { z } from "zod";
import { protocol } from "engine.io";

describe("Documentation", () => {
  const sampleConfig = createSimpleConfig();
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
          (doc.channels!.Root.bindings?.ws?.query as SchemaObject).properties
            ?.EIO as SchemaObject
        ).const,
      ).toEqual(protocol.toString());
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

    test("should handle bigint, boolean, null and readonly", () => {
      const spec = new Documentation({
        config: sampleConfig,
        actions: [
          factory.build({
            event: "test",
            input: z.tuple([
              z.object({
                bigint: z.bigint(),
                boolean: z.boolean().readonly(),
              }),
            ]),
            output: z.tuple([z.null()]),
            handler: async () => [null],
          }),
        ],
        version: "3.4.5",
        title: "Testing additional types",
      }).getSpecAsYaml();
      expect(spec).toMatchSnapshot();
    });

    test("should handle Date I/O", () => {
      const spec = new Documentation({
        config: sampleConfig,
        actions: [
          factory.build({
            event: "test",
            input: z.tuple([
              z.iso.datetime().transform((str) => new Date(str)),
            ]),
            output: z.tuple([
              z
                .date()
                .transform((date) => date.toISOString())
                .pipe(z.iso.datetime()),
            ]),
            handler: async () => [new Date()],
          }),
        ],
        version: "3.4.5",
        title: "Testing date transformations",
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
              z.record(z.string(), z.number().int()),
              z.record(z.string().regex(/[A-Z]+/), z.boolean()),
              z.record(z.number().int(), z.boolean()),
              z.record(z.literal("only"), z.boolean()),
              z.record(
                z.literal("option1").or(z.literal("option2")),
                z.boolean(),
              ),
              z.record(z.enum(["option1", "option2"]), z.boolean()),
            ]),
            handler: vi.fn(),
          }),
        ],
        version: "3.4.5",
        title: "Testing record",
      }).getSpecAsYaml();
      expect(spec).toMatchSnapshot();
    });

    test("should handle type any", () => {
      const spec = new Documentation({
        config: sampleConfig.addNamespace({
          path: "test",
          emission: {
            withAck: {
              schema: z.tuple([]),
              ack: z
                .tuple([z.any()])
                .rest(z.any())
                .meta({ examples: [["something"]] }),
            },
          },
        }),
        actions: [
          factory.build({
            event: "test",
            input: z.tuple([z.any()]),
            output: z.tuple([z.any()]),
            handler: vi.fn(),
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
            handler: vi.fn(),
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
              z.email(),
              z.uuid(),
              z.cuid(),
              z.cuid2(),
              z.ulid(),
              z.ipv4(),
              z.emoji(),
              z.url(),
              z.string().regex(/\d+/),
              z
                .email()
                .min(1)
                .regex(/.*@example\.com/is)
                .max(90),
            ]),
            output: z.tuple([z.string().min(1)]),
            handler: vi.fn(),
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
            output: z.tuple([z.enum({ FEG: 1, XYZ: 2 })]),
            handler: async () => [1 as const],
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

    test("should handle circular schemas via z.object()", () => {
      const category = z.object({
        name: z.string(),
        get subcategories() {
          return z.array(category);
        },
      });
      const spec = new Documentation({
        config: sampleConfig,
        actions: [
          factory.build({
            event: "test",
            input: z.tuple([category]),
            output: z.tuple([]).rest(z.object({ zodExample: category })),
            handler: async () => [
              {
                zodExample: {
                  name: "People",
                  subcategories: [
                    {
                      name: "Politicians",
                      subcategories: [
                        { name: "Presidents", subcategories: [] },
                      ],
                    },
                  ],
                },
              },
            ],
          }),
        ],
        version: "3.4.5",
        title: "Testing circular",
      }).getSpecAsYaml();
      expect(spec).toMatchSnapshot();
    });
  });

  describe("Security", () => {
    const secureConfig = new Config({
      security: [
        {
          type: "httpApiKey",
          description: "Sample security schema",
          in: "header",
          name: "X-Api-Key",
        },
      ],
    }).addNamespace({
      security: [
        {
          type: "userPassword",
          description: "Namespace level security sample",
        },
      ],
    });
    const secureFactory = new ActionsFactory(secureConfig);

    test("should depict server and channel security", () => {
      const spec = new Documentation({
        config: secureConfig,
        servers: { test: { url: "https://example.com" } },
        actions: [
          secureFactory.build({
            event: "test",
            input: z.tuple([]),
            handler: async () => {},
          }),
        ],
        version: "3.4.5",
        title: "Testing security",
      }).getSpecAsYaml();
      expect(spec).toMatchSnapshot();
    });
  });
});
