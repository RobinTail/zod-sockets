import { AssertionError } from "node:assert";
import { describe, expect, expectTypeOf, test } from "vitest";
import { z } from "zod/v4";
import {
  getMessageFromError,
  lcFirst,
  makeCleanId,
  ensureError,
} from "./common-helpers";

describe("Common helpers", () => {
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

  describe("ensureError()", () => {
    test.each([
      [new Error("error"), "error"],
      [
        new z.ZodError([
          {
            code: "invalid_type",
            expected: "string",
            input: 123,
            path: [""],
            message: "invalid type",
          },
        ]),
        `[\n  {\n    "code": "invalid_type",\n    "expected": "string",\n` +
          `    "input": 123,\n    "path": [\n      ""\n` +
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
      const result = ensureError(argument);
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
          input: "test",
        },
        {
          code: "invalid_type",
          path: ["user", "name"],
          message: "expected string, got number",
          expected: "string",
          input: 123,
        },
      ]);
      expect(getMessageFromError(error)).toMatchSnapshot();
    });

    test.each([[[]], [[0]], [[1, "some"]]])(
      "should handle path in ZodIssue %#",
      (path) => {
        const error = new z.ZodError([
          { code: "custom", path, message: "Custom error", input: "test" },
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
