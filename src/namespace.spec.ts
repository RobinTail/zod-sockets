import { describe, expect, test } from "vitest";
import { z } from "zod";
import { fallbackNamespaces, normalizeNS, rootNS } from "./namespace";

describe("Namespace", () => {
  describe("rootNS", () => {
    test("should be slash", () => {
      expect(rootNS).toBe("/");
    });
  });

  describe("fallbackNamespaces", () => {
    test("should consist of the empty root namespace", () => {
      expect(fallbackNamespaces).toEqual({
        "/": { emission: {}, hooks: {}, metadata: expect.any(z.ZodObject) },
      });
      expect(fallbackNamespaces[rootNS].metadata.shape).toEqual({});
    });
  });

  describe("normalizeNS()", () => {
    test.each(["test", "/test", " test "])("should add slash", (subject) => {
      expect(normalizeNS(subject)).toBe("/test");
    });
  });
});
