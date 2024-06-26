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
  withExamples,
} from "./documentation-helpers";
import { walkSchema } from "./schema-walker";
import { describe, expect, test } from "vitest";

describe("Documentation helpers", () => {
  const requestCtx = {
    direction: "in",
    next: (schema: z.ZodTypeAny) =>
      walkSchema(schema, {
        rules: depicters,
        ctx: requestCtx,
        onEach,
        onMissing,
      }),
  } satisfies AsyncAPIContext;
  const responseCtx = {
    direction: "out",
    next: (schema: z.ZodTypeAny) =>
      walkSchema(schema, {
        rules: depicters,
        ctx: responseCtx,
        onEach,
        onMissing,
      }),
  } satisfies AsyncAPIContext;

  describe("depictDefault()", () => {
    test("should set default property", () => {
      expect(
        depictDefault(z.boolean().default(true), requestCtx),
      ).toMatchSnapshot();
    });
  });

  describe("depictCatch()", () => {
    test("should pass next depicter", () => {
      expect(
        depictCatch(z.boolean().catch(true), requestCtx),
      ).toMatchSnapshot();
    });
  });

  describe("depictAny()", () => {
    test("should set format:any", () => {
      expect(depictAny(z.any(), requestCtx)).toMatchSnapshot();
    });
  });

  describe("depictUnion()", () => {
    test("should wrap next depicters into oneOf property", () => {
      expect(
        depictUnion(z.string().or(z.number()), requestCtx),
      ).toMatchSnapshot();
    });
  });

  describe("depictDiscriminatedUnion()", () => {
    test("should wrap next depicters in oneOf prop and set discriminator prop", () => {
      expect(
        depictDiscriminatedUnion(
          z.discriminatedUnion("status", [
            z.object({ status: z.literal("success"), data: z.any() }),
            z.object({
              status: z.literal("error"),
              error: z.object({ message: z.string() }),
            }),
          ]),
          requestCtx,
        ),
      ).toMatchSnapshot();
    });
  });

  describe("depictIntersection()", () => {
    test("should flatten two object schemas", () => {
      expect(
        depictIntersection(
          z.object({ one: z.number() }).and(z.object({ two: z.number() })),
          requestCtx,
        ),
      ).toMatchSnapshot();
    });

    test("should merge deeply", () => {
      expect(
        depictIntersection(
          z
            .object({ test: z.object({ a: z.number() }) })
            .and(z.object({ test: z.object({ b: z.number() }) })),
          requestCtx,
        ),
      ).toMatchSnapshot();
    });

    test("should flatten three object schemas", () => {
      expect(
        depictIntersection(
          z
            .object({ one: z.number() })
            .and(z.object({ two: z.number() }))
            .and(z.object({ three: z.number() })),
          requestCtx,
        ),
      ).toMatchSnapshot();
    });

    test("should maintain uniqueness in the array of required props", () => {
      expect(
        depictIntersection(
          z
            .record(z.literal("test"), z.number())
            .and(z.object({ test: z.literal(5) })),
          requestCtx,
        ),
      ).toMatchSnapshot();
    });

    test.each([
      z.record(z.string(), z.number()).and(z.object({ test: z.number() })), // has additionalProperties
      z.number().and(z.literal(5)), // not objects
    ])("should fall back to allOf in other cases %#", (schema) => {
      expect(depictIntersection(schema, requestCtx)).toMatchSnapshot();
    });
  });

  describe("depictOptional()", () => {
    test.each([requestCtx, responseCtx])(
      "should pass the next depicter %#",
      (ctx) => {
        expect(depictOptional(z.string().optional(), ctx)).toMatchSnapshot();
      },
    );
  });

  describe("depictNullable()", () => {
    test.each([requestCtx, responseCtx])(
      "should add null to the type %#",
      (ctx) => {
        expect(depictNullable(z.string().nullable(), ctx)).toMatchSnapshot();
      },
    );

    test.each([
      z.string().nullable(),
      z.null().nullable(),
      z.string().nullable().nullable(),
    ])("should only add null type once %#", (schema) => {
      expect(depictNullable(schema, requestCtx)).toMatchSnapshot();
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
        expect(depictEnum(schema, requestCtx)).toMatchSnapshot();
      },
    );
  });

  describe("depictLiteral()", () => {
    test.each(["testing", null, BigInt(123), Symbol("test")])(
      "should set type and involve const property %#",
      (value) => {
        expect(depictLiteral(z.literal(value), requestCtx)).toMatchSnapshot();
      },
    );
  });

  describe("depictObject()", () => {
    test.each([
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
        expect(depictObject(z.object(shape), ctx)).toMatchSnapshot();
      },
    );

    test("Bug #758", () => {
      const schema = z.object({
        a: z.string(),
        b: z.coerce.string(),
        c: z.coerce.string().optional(),
      });
      expect(depictObject(schema, responseCtx)).toMatchSnapshot();
    });
  });

  describe("depictNull()", () => {
    test("should give type:null", () => {
      expect(depictNull(z.null(), requestCtx)).toMatchSnapshot();
    });
  });

  describe("depictBoolean()", () => {
    test("should set type:boolean", () => {
      expect(depictBoolean(z.boolean(), requestCtx)).toMatchSnapshot();
    });
  });

  describe("depictBigInt()", () => {
    test("should set type:integer and format:bigint", () => {
      expect(depictBigInt(z.bigint(), requestCtx)).toMatchSnapshot();
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
        expect(depictRecord(schema, requestCtx)).toMatchSnapshot();
      },
    );
  });

  describe("depictArray()", () => {
    test("should set type:array and pass items depiction", () => {
      expect(depictArray(z.array(z.boolean()), requestCtx)).toMatchSnapshot();
    });
  });

  describe("depictTuple()", () => {
    test("should depict as array with individual items", () => {
      expect(
        depictTuple(
          z.tuple([z.boolean(), z.string(), z.literal("test")]),
          requestCtx,
        ),
      ).toMatchSnapshot();
    });
    test("should depict rest if defined", () => {
      expect(
        depictTuple(z.tuple([z.boolean()]).rest(z.string()), requestCtx),
      ).toMatchSnapshot();
    });
    test("must use no items if the tuple is empty", () => {
      expect(depictTuple(z.tuple([]), requestCtx)).toMatchSnapshot();
    });
  });

  describe("depictString()", () => {
    test("should set type:string", () => {
      expect(depictString(z.string(), requestCtx)).toMatchSnapshot();
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
      expect(depictString(schema, requestCtx)).toMatchSnapshot();
    });
  });

  describe("depictNumber()", () => {
    test.each([z.number(), z.number().int().min(10).max(20)])(
      "should type:number, min/max, format and exclusiveness props",
      (schema) => {
        expect(depictNumber(schema, requestCtx)).toMatchSnapshot();
      },
    );
  });

  describe("depictObjectProperties()", () => {
    test("should wrap next depicters in a shape of object", () => {
      expect(
        depictObjectProperties(
          z.object({
            one: z.string(),
            two: z.boolean(),
          }),
          requestCtx.next,
        ),
      ).toMatchSnapshot();
    });
  });

  describe("depictEffect()", () => {
    test.each([
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
      expect(depictEffect(schema, ctx)).toMatchSnapshot();
    });

    test.each([
      z.number().transform((num) => () => num),
      z.number().transform(() => assert.fail("this should be handled")),
    ])("should handle edge cases", (schema) => {
      expect(depictEffect(schema, responseCtx)).toMatchSnapshot();
    });
  });

  describe("depictPipeline", () => {
    test.each([
      { ctx: responseCtx, expected: "boolean (out)" },
      { ctx: requestCtx, expected: "string (in)" },
    ])("should depict as $expected", ({ ctx }) => {
      expect(
        depictPipeline(z.string().pipe(z.coerce.boolean()), ctx),
      ).toMatchSnapshot();
    });
  });

  describe("depictDate", () => {
    test.each([responseCtx, requestCtx])("should set format date %#", (ctx) => {
      expect(depictDate(z.date(), ctx)).toMatchSnapshot();
    });
  });

  describe("depictBranded", () => {
    test("should pass the next depicter", () => {
      expect(
        depictBranded(z.string().min(2).brand<"Test">(), responseCtx),
      ).toMatchSnapshot();
    });
  });

  describe("depictReadonly", () => {
    test("should pass the next depicter", () => {
      expect(
        depictReadonly(z.string().readonly(), responseCtx),
      ).toMatchSnapshot();
    });
  });

  describe("onEach()", () => {
    test.each([requestCtx, responseCtx])(
      "should skip reference objects",
      (ctx) => {
        expect(
          onEach(z.tuple([]), { prev: { $ref: "some ref" }, ...ctx }),
        ).toEqual({});
      },
    );
  });

  describe("withExamples()", () => {
    test("should return the subject if it's a reference or no examples given", () => {
      expect(withExamples({ $ref: "test" })).toEqual({ $ref: "test" });
      expect(withExamples({ type: "boolean" })).toEqual({ type: "boolean" });
    });
  });
});
