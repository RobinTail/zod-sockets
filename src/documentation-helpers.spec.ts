import type { GlobalMeta, JSONSchema } from "zod/v4/core";
import { z } from "zod/v4";
import {
  AsyncAPIContext,
  depictNullable,
  depictUnion,
  depictBigInt,
  depictTuple,
  depictPipeline,
  depictDate,
  getExamples,
} from "./documentation-helpers";
import assert from "node:assert/strict";
import { SchemaObject } from "./async-api/model";

describe("Documentation helpers", () => {
  const requestCtx: AsyncAPIContext = {
    isResponse: false,
    makeRef: vi.fn(),
  };
  const responseCtx: AsyncAPIContext = {
    isResponse: true,
    makeRef: vi.fn(),
  };

  describe("depictUnion()", () => {
    test("should set discriminator prop for such union", () => {
      const zodSchema = z.discriminatedUnion("status", [
        z.object({ status: z.literal("success"), data: z.any() }),
        z.object({
          status: z.literal("error"),
          error: z.object({ message: z.string() }),
        }),
      ]);
      expect(
        depictUnion({ zodSchema, jsonSchema: {} }, requestCtx),
      ).toMatchSnapshot();
    });
  });

  describe("depictNullable()", () => {
    test.each([requestCtx, responseCtx])(
      "should add null type to the first of anyOf %#",
      (ctx) => {
        const jsonSchema: JSONSchema.BaseSchema = {
          anyOf: [{ type: "string" }, { type: "null" }],
        };
        expect(
          depictNullable({ zodSchema: z.never(), jsonSchema }, ctx),
        ).toMatchSnapshot();
      },
    );

    test.each<SchemaObject>([
      { type: "null" },
      {
        anyOf: [{ type: "null" }, { type: "null" }],
      },
      {
        anyOf: [
          { type: ["string", "null"] }, // nullable of nullable case
          { type: "null" },
        ],
      },
    ])("should not add null type when it's already there %#", (jsonSchema) => {
      expect(
        depictNullable(
          {
            zodSchema: z.never(),
            jsonSchema: jsonSchema as JSONSchema.BaseSchema,
          },
          requestCtx,
        ),
      ).toMatchSnapshot();
    });
  });

  describe("depictBigInt()", () => {
    test("should set type:string and format:bigint", () => {
      expect(
        depictBigInt({ zodSchema: z.never(), jsonSchema: {} }, requestCtx),
      ).toMatchSnapshot();
    });
  });

  describe("depictTuple()", () => {
    test.each([
      z.tuple([z.boolean(), z.string(), z.literal("test")]),
      z.tuple([]),
    ])("should add items:not:{} when no rest %#", (zodSchema) => {
      expect(
        depictTuple({ zodSchema, jsonSchema: {} }, requestCtx),
      ).toMatchSnapshot();
    });
  });

  describe("depictDate", () => {
    test.each([responseCtx, requestCtx])("should set format date %#", (ctx) => {
      expect(
        depictDate({ zodSchema: z.date(), jsonSchema: {} }, ctx),
      ).toMatchSnapshot();
    });
  });

  describe("depictPipeline", () => {
    test.each([
      {
        zodSchema: z.string().transform((v) => parseInt(v, 10)),
        ctx: responseCtx,
        expected: "number (out)",
      },
      {
        zodSchema: z.preprocess((v) => parseInt(`${v}`, 10), z.string()),
        ctx: requestCtx,
        expected: "string (preprocess)",
      },
    ])("should depict as $expected", ({ zodSchema, ctx }) => {
      expect(
        depictPipeline({ zodSchema, jsonSchema: {} }, ctx),
      ).toMatchSnapshot();
    });

    test.each([
      z.number().transform((num) => () => num),
      z.number().transform(() => assert.fail("this should be handled")),
    ])("should handle edge cases %#", (zodSchema) => {
      expect(
        depictPipeline({ zodSchema, jsonSchema: {} }, responseCtx),
      ).toEqual({});
    });
  });

  describe("getExamples()", () => {
    test.each<GlobalMeta>([
      { examples: [1, 2, 3] },
      { examples: [] },
      { examples: undefined },
      { examples: { one: { value: 123 } } },
      { example: 123 },
      { example: 0 },
      { example: undefined },
      { examples: [1, 2, 3], example: 123 }, // priority
      {},
    ])("should handle %s", (meta) => {
      const schema = z.unknown().meta(meta);
      expect(getExamples(schema)).toMatchSnapshot();
    });
  });

  test("should pull for tuples", () => {
    const schema = z
      .tuple([
        z.string().meta({ examples: ["123", "456"] }),
        z.number().meta({ example: 123 }),
      ])
      .rest(z.boolean());
    expect(getExamples(schema)).toMatchSnapshot();
  });
});
