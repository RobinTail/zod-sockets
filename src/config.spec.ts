import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { createConfig } from "./config";
import { AbstractLogger } from "./logger";

describe("Config", () => {
  describe("createConfig()", () => {
    test("should returns its argument", () => {
      expect(
        createConfig({
          emission: {
            "/": {},
            test: {},
          },
          timeout: 2000,
          logger: { debug: vi.fn() } as unknown as AbstractLogger,
        }),
      ).toEqual({
        emission: { "/": {}, test: {} },
        timeout: 2000,
        logger: { debug: expect.any(Function) },
      });
    });

    test("should ensure namespaces", () => {
      const schema = z.tuple([]);
      expect(
        createConfig({
          emission: { test: { schema } },
          timeout: 2000,
          logger: { debug: vi.fn() } as unknown as AbstractLogger,
        }),
      ).toEqual({
        emission: { "/": { test: { schema } } },
        timeout: 2000,
        logger: { debug: expect.any(Function) },
      });
    });
  });
});
