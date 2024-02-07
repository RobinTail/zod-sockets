import { describe, expect, test } from "vitest";
import { createConfig } from "./config";

describe("Config", () => {
  describe("createConfig()", () => {
    test("should return its argument", () => {
      expect(createConfig({ emission: {}, timeout: 2000 })).toEqual({
        emission: {},
        timeout: 2000,
      });
    });
  });
});
