import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { Config } from "./config";
import { AbstractLogger } from "./logger";

describe("Config", () => {
  describe("createConfig()", () => {
    test("should create config without any argument", () => {
      const config = new Config();
      expect(config).toBeInstanceOf(Config);
      expect(config.logger).toEqual(console);
      expect(config.timeout).toBe(2000);
      expect(config.namespaces).toEqual({
        "/": { emission: {}, hooks: {}, metadata: expect.any(z.ZodObject) },
      });
    });

    test("should create the class instance from the definition", () => {
      const config = new Config({
        namespaces: {
          "/": { emission: {}, hooks: {}, metadata: z.object({}) },
          test: { emission: {}, hooks: {}, metadata: z.object({}) },
        },
        timeout: 2000,
        logger: { debug: vi.fn() } as unknown as AbstractLogger,
      });
      expect(config).toBeInstanceOf(Config);
      expect(config.logger).toEqual({ debug: expect.any(Function) });
      expect(config.timeout).toBe(2000);
      expect(config.namespaces).toEqual({
        "/": { emission: {}, hooks: {}, metadata: expect.any(z.ZodObject) },
        test: { emission: {}, hooks: {}, metadata: expect.any(z.ZodObject) },
      });
    });

    test("should set defaults and provide namespace augmentation method", () => {
      const base = new Config({});
      expect(base).toBeInstanceOf(Config);
      expect(base.logger).toEqual(console);
      expect(base.timeout).toBe(2000);
      expect(base.namespaces).toEqual({
        "/": { emission: {}, hooks: {}, metadata: expect.any(z.ZodObject) },
      });
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
          metadata: expect.any(z.ZodObject),
        },
      });
    });

    test("should allow to disable root namespace", () => {
      const config = new Config({ namespaces: {} });
      expect(config.namespaces).toEqual({});
    });
  });
});
