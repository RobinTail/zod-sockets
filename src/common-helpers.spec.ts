import { describe, expect, test } from "vitest";
import { z } from "zod";
import { combinations, hasCoercion } from "./common-helpers";

describe("Common helpers", () => {
  describe("hasCoercion()", () => {
    test.each([
      { schema: z.string(), coercion: false },
      { schema: z.coerce.string(), coercion: true },
      { schema: z.boolean({ coerce: true }), coercion: true },
      { schema: z.custom(), coercion: false },
    ])(
      "should check the presence and value of coerce prop %#",
      ({ schema, coercion }) => {
        expect(hasCoercion(schema)).toBe(coercion);
      },
    );
  });

  describe("combinations()", () => {
    test("should run callback on each combination of items from two arrays", () => {
      expect(combinations([1, 2], [4, 5, 6], ([a, b]) => a + b)).toEqual([
        5, 6, 7, 6, 7, 8,
      ]);
    });

    test("should handle one or two arrays are empty", () => {
      expect(combinations([], [4, 5, 6], ([a, b]) => a + b)).toEqual([4, 5, 6]);
      expect(combinations([1, 2, 3], [], ([a, b]) => a + b)).toEqual([1, 2, 3]);
      expect(combinations<number>([], [], ([a, b]) => a + b)).toEqual([]);
    });
  });
});
