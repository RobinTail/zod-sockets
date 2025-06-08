import type { JSONSchema } from "zod/v4/core";
import { z } from "zod/v4";
import {
  AsyncAPIContext,
  depictNullable,
  depictUnion,
  depictBigInt,
  depictTuple,
  depictPipeline,
} from "./documentation-helpers";
import { describe, expect, test } from "vitest";
import assert from "node:assert/strict";

describe("Documentation helpers", () => {
  const requestCtx: AsyncAPIContext = {
    isResponse: false,
  };
  const responseCtx: AsyncAPIContext = {
    isResponse: true,
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

    test.each([
      { type: "null" },
      {
        anyOf: [{ type: "null" }, { type: "null" }],
      },
      {
        anyOf: [
          { type: ["string", "null"] as unknown as string }, // nullable of nullable case
          { type: "null" },
        ],
      },
    ])("should not add null type when it's already there %#", (jsonSchema) => {
      expect(
        depictNullable({ zodSchema: z.never(), jsonSchema }, requestCtx),
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
});
