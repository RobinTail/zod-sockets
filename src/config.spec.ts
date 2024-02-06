import { describe, expect, test } from "vitest";
import { createSocketsConfig } from "./config";

describe("Config", () => {
  describe("createConfig()", () => {
    test("should return its argument", () => {
      expect(createSocketsConfig({ emission: {}, timeout: 2000 })).toEqual({
        emission: {},
        timeout: 2000,
      });
    });
  });
});
