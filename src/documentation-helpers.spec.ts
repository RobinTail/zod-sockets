import assert from "node:assert/strict";
import { z } from "zod";
import {
  AsyncAPIContext,
  depictAny,
  depictArray,
  depictBigInt,
  depictBoolean,
  depictBranded,
  depictCatch,
  depictDate,
  depictDefault,
  depictDiscriminatedUnion,
  depictEffect,
  depictEnum,
  depictIntersection,
  depictLiteral,
  depictNull,
  depictNullable,
  depictNumber,
  depictObject,
  depictObjectProperties,
  depictOptional,
  depictPipeline,
  depictReadonly,
  depictRecord,
  depictString,
  depictTuple,
  depictUnion,
  depicters,
  onEach,
  onMissing,
} from "./documentation-helpers";
import { walkSchema } from "./schema-walker";
import { describe, expect, test } from "vitest";

describe("Documentation helpers", () => {
  const requestCtx: AsyncAPIContext = {
    direction: "in",
  };
  const responseCtx: AsyncAPIContext = {
    direction: "out",
  };
  const makeNext = (ctx: AsyncAPIContext) => (schema: z.ZodTypeAny) =>
    walkSchema({
      schema,
      rules: depicters,
      ...ctx,
      onEach,
      onMissing,
    });

  describe("depictDefault()", () => {
    test("should set default property", () => {
      expect(
        depictDefault({
          schema: z.boolean().default(true),
          ...requestCtx,
          next: makeNext(requestCtx),
        }),
      ).toMatchSnapshot();
    });
  });

  describe("depictCatch()", () => {
    test("should pass next depicter", () => {
      expect(
        depictCatch({
          schema: z.boolean().catch(true),
          ...requestCtx,
          next: makeNext(requestCtx),
        }),
      ).toMatchSnapshot();
    });
  });

  describe("depictAny()", () => {
    test("should set format:any", () => {
      expect(
        depictAny({
          schema: z.any(),
          ...requestCtx,
          next: makeNext(requestCtx),
        }),
      ).toMatchSnapshot();
    });
  });

  describe("depictUnion()", () => {
    test("should wrap next depicters into oneOf property", () => {
      expect(
        depictUnion({
          schema: z.string().or(z.number()),
          ...requestCtx,
          next: makeNext(requestCtx),
        }),
      ).toMatchSnapshot();
    });
  });

  describe("depictDiscriminatedUnion()", () => {
    test("should wrap next depicters in oneOf prop and set discriminator prop", () => {
      expect(
        depictDiscriminatedUnion({
          schema: z.discriminatedUnion("status", [
            z.object({ status: z.literal("success"), data: z.any() }),
            z.object({
              status: z.literal("error"),
              error: z.object({ message: z.string() }),
            }),
          ]),
          ...requestCtx,
          next: makeNext(requestCtx),
        }),
      ).toMatchSnapshot();
    });
  });

  describe("depictIntersection()", () => {
    test("should flatten two object schemas", () => {
      expect(
        depictIntersection({
          schema: z
            .object({ one: z.number() })
            .and(z.object({ two: z.number() })),
          ...requestCtx,
          next: makeNext(requestCtx),
        }),
      ).toMatchSnapshot();
    });

    test("should merge deeply", () => {
      expect(
        depictIntersection({
          schema: z
            .object({ test: z.object({ a: z.number() }) })
            .and(z.object({ test: z.object({ b: z.number() }) })),
          ...requestCtx,
          next: makeNext(requestCtx),
        }),
      ).toMatchSnapshot();
    });

    test("should flatten three object schemas", () => {
      expect(
        depictIntersection({
          schema: z
            .object({ one: z.number() })
            .and(z.object({ two: z.number() }))
            .and(z.object({ three: z.number() })),
          ...requestCtx,
          next: makeNext(requestCtx),
        }),
      ).toMatchSnapshot();
    });

    test("should maintain uniqueness in the array of required props", () => {
      expect(
        depictIntersection({
          schema: z
            .record(z.literal("test"), z.number())
            .and(z.object({ test: z.literal(5) })),
          ...requestCtx,
          next: makeNext(requestCtx),
        }),
      ).toMatchSnapshot();
    });

    test.each([
      z.record(z.string(), z.number()).and(z.object({ test: z.number() })), // has additionalProperties
      z.number().and(z.literal(5)), // not objects
    ])("should fall back to allOf in other cases %#", (schema) => {
      expect(
        depictIntersection({
          schema,
          ...requestCtx,
          next: makeNext(requestCtx),
        }),
      ).toMatchSnapshot();
    });
  });

  describe("depictOptional()", () => {
    test.each<AsyncAPIContext>([requestCtx, responseCtx])(
      "should pass the next depicter %#",
      (ctx) => {
        expect(
          depictOptional({
            schema: z.string().optional(),
            ...ctx,
            next: makeNext(ctx),
          }),
        ).toMatchSnapshot();
      },
    );
  });

  describe("depictNullable()", () => {
    test.each<AsyncAPIContext>([requestCtx, responseCtx])(
      "should add null to the type %#",
      (ctx) => {
        expect(
          depictNullable({
            schema: z.string().nullable(),
            ...ctx,
            next: makeNext(ctx),
          }),
        ).toMatchSnapshot();
      },
    );

    test.each([
      z.string().nullable(),
      z.null().nullable(),
      z.string().nullable().nullable(),
    ])("should only add null type once %#", (schema) => {
      expect(
        depictNullable({
          schema,
          ...requestCtx,
          next: makeNext(requestCtx),
        }),
      ).toMatchSnapshot();
    });
  });

  describe("depictEnum()", () => {
    enum Test {
      one = "ONE",
      two = "TWO",
    }
    test.each([z.enum(["one", "two"]), z.nativeEnum(Test)])(
      "should set type and enum properties",
      (schema) => {
        expect(
          depictEnum({
            schema,
            ...requestCtx,
            next: makeNext(requestCtx),
          }),
        ).toMatchSnapshot();
      },
    );
  });

  describe("depictLiteral()", () => {
    test("should set type and involve enum property", () => {
      expect(
        depictLiteral({
          schema: z.literal("testing"),
          ...requestCtx,
          next: makeNext(requestCtx),
        }),
      ).toMatchSnapshot();
    });
  });

  describe("depictObject()", () => {
    test.each<{ ctx: AsyncAPIContext; shape: z.ZodRawShape }>([
      { ctx: requestCtx, shape: { a: z.number(), b: z.string() } },
      { ctx: responseCtx, shape: { a: z.number(), b: z.string() } },
      {
        ctx: responseCtx,
        shape: { a: z.coerce.number(), b: z.string({ coerce: true }) },
      },
      { ctx: responseCtx, shape: { a: z.number(), b: z.string().optional() } },
      {
        ctx: requestCtx,
        shape: { a: z.number().optional(), b: z.coerce.string() },
      },
    ])(
      "should type:object, properties and required props %#",
      ({ shape, ctx }) => {
        expect(
          depictObject({
            schema: z.object(shape),
            ...ctx,
            next: makeNext(ctx),
          }),
        ).toMatchSnapshot();
      },
    );

    test("Bug #758", () => {
      const schema = z.object({
        a: z.string(),
        b: z.coerce.string(),
        c: z.coerce.string().optional(),
      });
      expect(
        depictObject({
          schema,
          ...responseCtx,
          next: makeNext(responseCtx),
        }),
      ).toMatchSnapshot();
    });
  });

  describe("depictNull()", () => {
    test("should give type:null", () => {
      expect(
        depictNull({
          schema: z.null(),
          ...requestCtx,
          next: makeNext(requestCtx),
        }),
      ).toMatchSnapshot();
    });
  });

  describe("depictBoolean()", () => {
    test("should set type:boolean", () => {
      expect(
        depictBoolean({
          schema: z.boolean(),
          ...requestCtx,
          next: makeNext(requestCtx),
        }),
      ).toMatchSnapshot();
    });
  });

  describe("depictBigInt()", () => {
    test("should set type:integer and format:bigint", () => {
      expect(
        depictBigInt({
          schema: z.bigint(),
          ...requestCtx,
          next: makeNext(requestCtx),
        }),
      ).toMatchSnapshot();
    });
  });

  describe("depictRecord()", () => {
    test.each([
      z.record(z.boolean()),
      z.record(z.string(), z.boolean()),
      z.record(z.enum(["one", "two"]), z.boolean()),
      z.record(z.literal("testing"), z.boolean()),
      z.record(z.literal("one").or(z.literal("two")), z.boolean()),
      z.record(z.any()), // Issue #900
    ])(
      "should set properties+required or additionalProperties props %#",
      (schema) => {
        expect(
          depictRecord({
            schema,
            ...requestCtx,
            next: makeNext(requestCtx),
          }),
        ).toMatchSnapshot();
      },
    );
  });

  describe("depictArray()", () => {
    test("should set type:array and pass items depiction", () => {
      expect(
        depictArray({
          schema: z.array(z.boolean()),
          ...requestCtx,
          next: makeNext(requestCtx),
        }),
      ).toMatchSnapshot();
    });
  });

  describe("depictTuple()", () => {
    test("should utilize prefixItems", () => {
      expect(
        depictTuple({
          schema: z.tuple([z.boolean(), z.string(), z.literal("test")]),
          ...requestCtx,
          next: makeNext(requestCtx),
        }),
      ).toMatchSnapshot();
    });
  });

  describe("depictString()", () => {
    test("should set type:string", () => {
      expect(
        depictString({
          schema: z.string(),
          ...requestCtx,
          next: makeNext(requestCtx),
        }),
      ).toMatchSnapshot();
    });

    test.each([
      z.string().email().min(10).max(20),
      z.string().url().length(15),
      z.string().uuid(),
      z.string().cuid(),
      z.string().datetime(),
      z.string().datetime({ offset: true }),
      z.string().regex(/^\d+.\d+.\d+$/),
    ])("should set format, pattern and min/maxLength props %#", (schema) => {
      expect(
        depictString({
          schema,
          ...requestCtx,
          next: makeNext(requestCtx),
        }),
      ).toMatchSnapshot();
    });
  });

  describe("depictNumber()", () => {
    test.each([z.number(), z.number().int().min(10).max(20)])(
      "should type:number, min/max, format and exclusiveness props",
      (schema) => {
        expect(
          depictNumber({
            schema,
            ...requestCtx,
            next: makeNext(requestCtx),
          }),
        ).toMatchSnapshot();
      },
    );
  });

  describe("depictObjectProperties()", () => {
    test("should wrap next depicters in a shape of object", () => {
      expect(
        depictObjectProperties({
          schema: z.object({
            one: z.string(),
            two: z.boolean(),
          }),
          ...requestCtx,
          next: makeNext(requestCtx),
        }),
      ).toMatchSnapshot();
    });
  });

  describe("depictEffect()", () => {
    test.each<{
      ctx: AsyncAPIContext;
      schema: z.ZodEffects<any>;
      expected: string;
    }>([
      {
        schema: z.string().transform((v) => parseInt(v, 10)),
        ctx: responseCtx,
        expected: "number (out)",
      },
      {
        schema: z.string().transform((v) => parseInt(v, 10)),
        ctx: requestCtx,
        expected: "string (in)",
      },
      {
        schema: z.preprocess((v) => parseInt(`${v}`, 10), z.string()),
        ctx: requestCtx,
        expected: "string (preprocess)",
      },
      {
        schema: z
          .object({ s: z.string() })
          .refine(() => false, { message: "test" }),
        ctx: requestCtx,
        expected: "object (refinement)",
      },
    ])("should depict as $expected", ({ schema, ctx }) => {
      expect(
        depictEffect({
          schema,
          ...ctx,
          next: makeNext(ctx),
        }),
      ).toMatchSnapshot();
    });

    test.each([
      z.number().transform((num) => () => num),
      z.number().transform(() => assert.fail("this should be handled")),
    ])("should handle edge cases", (schema) => {
      expect(
        depictEffect({
          schema,
          ...responseCtx,
          next: makeNext(responseCtx),
        }),
      ).toMatchSnapshot();
    });
  });

  describe("depictPipeline", () => {
    test.each<{ ctx: AsyncAPIContext; expected: string }>([
      { ctx: responseCtx, expected: "boolean (out)" },
      { ctx: requestCtx, expected: "string (in)" },
    ])("should depict as $expected", ({ ctx }) => {
      expect(
        depictPipeline({
          schema: z.string().pipe(z.coerce.boolean()),
          ...ctx,
          next: makeNext(ctx),
        }),
      ).toMatchSnapshot();
    });
  });

  describe("depictDate", () => {
    test.each<AsyncAPIContext>([responseCtx, requestCtx])(
      "should set format date %#",
      (ctx) => {
        expect(
          depictDate({
            schema: z.date(),
            ...ctx,
            next: makeNext(ctx),
          }),
        ).toMatchSnapshot();
      },
    );
  });

  describe("depictBranded", () => {
    test("should pass the next depicter", () => {
      expect(
        depictBranded({
          schema: z.string().min(2).brand<"Test">(),
          ...responseCtx,
          next: makeNext(responseCtx),
        }),
      ).toMatchSnapshot();
    });
  });

  describe("depictReadonly", () => {
    test("should pass the next depicter", () => {
      expect(
        depictReadonly({
          schema: z.string().readonly(),
          ...responseCtx,
          next: makeNext(responseCtx),
        }),
      ).toMatchSnapshot();
    });
  });

  describe("onEach()", () => {
    test.each([requestCtx, responseCtx])(
      "should skip reference objects",
      (ctx) => {
        expect(
          onEach({ prev: { $ref: "some ref" }, ...ctx, schema: z.tuple([]) }),
        ).toEqual({});
      },
    );
  });
});
