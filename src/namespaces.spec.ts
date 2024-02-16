import { describe, expect, test } from "vitest";
import { ensureNamespaces } from "./namespaces";

describe("Namespaces", () => {
  describe("ensureNamespaces()", () => {
    test("Should wrap checked items into root namespace (immutable)", () => {
      const subject = { test: 123, some: {} };
      expect(
        ensureNamespaces(subject, (value) => typeof value === "number"),
      ).toEqual({
        "/": { test: 123 },
        some: {},
      });
      // immutable
      expect(subject).toHaveProperty("test");
      expect(subject).not.toHaveProperty("/");
    });
  });
});
