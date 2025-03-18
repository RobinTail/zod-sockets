import { AssertionError } from "node:assert";
import { describe, expect, expectTypeOf, test } from "vitest";
import { z } from "zod";
import {
  getMessageFromError,
  hasCoercion,
  lcFirst,
  makeCleanId,
  makeErrorFromAnything,
} from "./common-helpers";

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

  describe("makeCleanId()", () => {
    test.each([
      ["get"],
      ["post", "/", "something"],
      ["delete", "/user", "permanently"],
      ["patch", "/user/affiliated/account"],
      ["put", "/assets/into/:storageIdentifier"],
      ["get", "/flightDetails/:from-:to/:seatID"],
      ["get", "/companys/:companyId/users/:userId"],
    ])(
      "should generate valid identifier from the supplied strings %#",
      (...args) => {
        expect(makeCleanId(...args)).toMatchSnapshot();
      },
    );
  });

  describe("lcFirst()", () => {
    test("should make the first letter lower case", () => {
      expect(lcFirst("HereIsSomeText")).toBe("hereIsSomeText");
    });
  });

  describe("makeErrorFromAnything()", () => {
    test.each([
      [new Error("error"), "error"],
      [
        new z.ZodError([
          {
            code: "invalid_type",
            expected: "string",
            received: "number",
            path: [""],
            message: "invalid type",
          },
        ]),
        `[\n  {\n    "code": "invalid_type",\n    "expected": "string",\n` +
          `    "received": "number",\n    "path": [\n      ""\n` +
          `    ],\n    "message": "invalid type"\n  }\n]`,
      ],
      [
        new AssertionError({ message: "Internal Server Error" }),
        "Internal Server Error",
      ],
      [undefined, "undefined"],
      [null, "null"],
      ["string", "string"],
      [123, "123"],
      [{}, "[object Object]"],
      [{ test: "object" }, "[object Object]"],
      [NaN, "NaN"],
      [0, "0"],
      ["", ""],
      [-1, "-1"],
      [Infinity, "Infinity"],
      [BigInt(123), "123"],
      [Symbol("symbol"), "Symbol(symbol)"],
      [true, "true"],
      [false, "false"],
      [() => {}, "() => {\n      }"],
      [/regexp/is, "/regexp/is"],
      [[1, 2, 3], "1,2,3"],
    ])("should accept %#", (argument, expected) => {
      const result = makeErrorFromAnything(argument);
      expectTypeOf(result).toEqualTypeOf<Error>();
      expect(result).toBeInstanceOf(Error);
      expect(result).toHaveProperty("message");
      expect(typeof result.message).toBe("string");
      expect(result.message).toBe(expected);
    });
  });

  describe("getMessageFromError()", () => {
    test("should compile a string from ZodError", () => {
      const error = new z.ZodError([
        {
          code: "invalid_type",
          path: ["user", "id"],
          message: "expected number, got string",
          expected: "number",
          received: "string",
        },
        {
          code: "invalid_type",
          path: ["user", "name"],
          message: "expected string, got number",
          expected: "string",
          received: "number",
        },
      ]);
      expect(getMessageFromError(error)).toMatchSnapshot();
    });

    test.each([[[]], [[0]], [[1, "some"]]])(
      "should handle path in ZodIssue %#",
      (path) => {
        const error = new z.ZodError([
          { code: "custom", path, message: "Custom error" },
        ]);
        expect(getMessageFromError(error)).toMatchSnapshot();
      },
    );

    test.each([
      new Error("something went wrong"),
      new AssertionError({ message: "something went wrong" }),
    ])("should pass message from other error types %#", (error) => {
      expect(getMessageFromError(error)).toMatchSnapshot();
    });
  });
});
