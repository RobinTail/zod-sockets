import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { createConfig } from "./config";
import { AbstractLogger } from "./logger";

describe("Config", () => {
  const metadata = z.object({});

  describe("createConfig()", () => {
    test("should return its argument", () => {
      expect(
        createConfig({
          emission: {
            "/": {},
            test: {},
          },
          metadata,
          timeout: 2000,
          logger: { debug: vi.fn() } as unknown as AbstractLogger,
        }),
      ).toEqual({
        emission: { "/": {}, test: {} },
        timeout: 2000,
        logger: { debug: expect.any(Function) },
        metadata,
      });
    });

    test("should ensure namespaces", () => {
      const schema = z.tuple([]);
      expect(
        createConfig({
          emission: { test: { schema } },
          metadata,
          timeout: 2000,
          logger: { debug: vi.fn() } as unknown as AbstractLogger,
        }),
      ).toEqual({
        emission: { "/": { test: { schema } } },
        metadata,
        timeout: 2000,
        logger: { debug: expect.any(Function) },
      });
    });
  });
});
