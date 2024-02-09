import { describe, expect, test, vi } from "vitest";
import { createConfig } from "./config";
import { AbstractLogger } from "./logger";

describe("Config", () => {
  describe("createConfig()", () => {
    test("should return its argument", () => {
      expect(
        createConfig({
          emission: {},
          timeout: 2000,
          logger: { debug: vi.fn() } as unknown as AbstractLogger,
        }),
      ).toEqual({
        emission: {},
        timeout: 2000,
        logger: { debug: expect.any(Function) },
      });
    });
  });
});
