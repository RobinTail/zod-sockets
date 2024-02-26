import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { Config, createConfig } from "./config";
import { AbstractLogger } from "./logger";

describe("Config", () => {
  describe("createConfig()", () => {
    test("should create the class instance from the definition", () => {
      const config = createConfig({
        namespaces: {
          "/": { emission: {}, hooks: {} },
          test: { emission: {}, hooks: {} },
        },
        timeout: 2000,
        logger: { debug: vi.fn() } as unknown as AbstractLogger,
      });
      expect(config).toBeInstanceOf(Config);
      expect(config.logger).toEqual({ debug: expect.any(Function) });
      expect(config.timeout).toBe(2000);
      expect(config.namespaces).toEqual({
        "/": { emission: {}, hooks: {} },
        test: { emission: {}, hooks: {} },
      });
    });

    test("should set defaults and provide namespace augmentation method", () => {
      const base = createConfig({});
      expect(base).toBeInstanceOf(Config);
      expect(base.logger).toEqual(console);
      expect(base.timeout).toBe(2000);
      expect(base.namespaces).toEqual({ "/": { emission: {}, hooks: {} } });
      const schema = z.tuple([]);
      const config = base.addNamespace({
        path: "/",
        emission: { test: { schema } },
      });
      expect(config).toBeInstanceOf(Config);
      expect(config.namespaces).toEqual({
        "/": {
          emission: { test: { schema } },
          hooks: {},
        },
      });
    });
  });
});
