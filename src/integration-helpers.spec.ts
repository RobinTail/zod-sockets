import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  hasCoercion,
  lcFirst,
  makeCleanId,
  makeEventFnSchema,
} from "./integration-helpers";

describe("Integration helpers", () => {
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

  describe("makeEventFnSchema()", () => {
    test("should simply use base when no ack", () => {
      const base = z.tuple([z.string()]);
      const result = makeEventFnSchema(base);
      expect(JSON.stringify(result)).toBe(
        JSON.stringify(z.function(base, z.void())),
      );
    });

    test("should add ack when no rest in base", () => {
      const base = z.tuple([z.string()]);
      const ack = z.tuple([z.number()]);
      const result = makeEventFnSchema(base, ack);
      expect(JSON.stringify(result)).toBe(
        JSON.stringify(
          z.function(
            z.tuple([z.string(), z.function(ack, z.void())]),
            z.void(),
          ),
        ),
      );
    });

    test("should use overloads when both rest and ack are present", () => {
      const base = z.tuple([z.string()]).rest(z.unknown());
      const ack = z.tuple([z.number()]);
      const result = makeEventFnSchema(base, ack, 2);
      expect(JSON.stringify(result)).toBe(
        JSON.stringify(
          z.union([
            z.function(
              z.tuple([z.string(), z.function(ack, z.void())]),
              z.void(),
            ),
            z.function(
              z.tuple([
                z.string(),
                z.unknown().describe("rest1"),
                z.function(ack, z.void()),
              ]),
              z.void(),
            ),
            z.function(
              z.tuple([
                z.string(),
                z.unknown().describe("rest1"),
                z.unknown().describe("rest2"),
                z.function(ack, z.void()),
              ]),
              z.void(),
            ),
          ]),
        ),
      );
    });
  });
});
