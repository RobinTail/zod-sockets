import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  hasCoercion,
  lcFirst,
  makeCleanId,
  makeCleanIdWithFallback,
} from "./common-helpers";
import { rootNS } from "./namespace";

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

  describe("makeCleanIdWithFallback", () => {
    test.each([rootNS, "/", " / ", "."])(
      "should use fallback if it's too clean",
      (subject) => {
        expect(makeCleanIdWithFallback(subject, "Root")).toBe("Root");
      },
    );
    test("should make a clean id out of it", () => {
      expect(makeCleanIdWithFallback("/public/chat", "no")).toBe("PublicChat");
    });
  });

  describe("lcFirst()", () => {
    test("should make the first letter lower case", () => {
      expect(lcFirst("HereIsSomeText")).toBe("hereIsSomeText");
    });
  });
});
