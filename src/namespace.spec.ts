import { describe, expect, test } from "vitest";
import { normalizeNS, rootNS } from "./namespace";

describe("Namespace", () => {
  describe("rootNS", () => {
    test("should be slash", () => {
      expect(rootNS).toBe("/");
    });
  });

  describe("normalizeNS()", () => {
    test.each(["test", "/test", " test "])("should add slash", (subject) => {
      expect(normalizeNS(subject)).toBe("/test");
    });
  });
});
