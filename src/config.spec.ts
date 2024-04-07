import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { Config, createSimpleConfig } from "./config";
import { AbstractLogger } from "./logger";

describe("Config", () => {
  describe("::constructor", () => {
    test("should create config without any argument", () => {
      const config = new Config();
      expect(config).toBeInstanceOf(Config);
      expect(config.logger).toEqual(console);
      expect(config.timeout).toBe(2000);
      expect(config.namespaces).toEqual({});
    });

    test("should create the class instance from the definition", () => {
      const config = new Config({
        namespaces: {
          "/": {
            emission: {},
            hooks: {},
            metadata: z.object({}),
            examples: {},
          },
          test: {
            emission: {},
            hooks: {},
            metadata: z.object({}),
            examples: {},
          },
        },
        timeout: 3000,
        logger: { debug: vi.fn() } as unknown as AbstractLogger,
      });
      expect(config).toBeInstanceOf(Config);
      expect(config.logger).toEqual({ debug: expect.any(Function) });
      expect(config.timeout).toBe(3000);
      expect(config.namespaces).toEqual({
        "/": {
          emission: {},
          hooks: {},
          metadata: expect.any(z.ZodObject),
          examples: {},
        },
        test: {
          emission: {},
          hooks: {},
          metadata: expect.any(z.ZodObject),
          examples: {},
        },
      });
    });
  });

  describe(".addNamespace()", () => {
    test("should provide namespace augmentation method", () => {
      const base = new Config();
      expect(base).toBeInstanceOf(Config);
      expect(base.logger).toEqual(console);
      expect(base.timeout).toBe(2000);
      expect(base.namespaces).toEqual({});
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
          examples: {},
        },
      });
    });
  });

  describe("createSimpleConfig()", () => {
    test("should set defaults", () => {
      const config = createSimpleConfig();
      expect(config).toBeInstanceOf(Config);
      expect(config.logger).toEqual(console);
      expect(config.timeout).toBe(2000);
      expect(config.namespaces).toEqual({
        "/": {
          emission: {},
          hooks: {},
          metadata: expect.any(z.ZodObject),
          examples: {},
        },
      });
    });

    test("should set the root namespace properties", () => {
      const config = createSimpleConfig({
        timeout: 3000,
        logger: { debug: vi.fn() } as unknown as AbstractLogger,
        emission: {},
        hooks: {},
        metadata: z.object({}),
      });
      expect(config).toBeInstanceOf(Config);
      expect(config.logger).not.toEqual(console);
      expect(config.timeout).toBe(3000);
      expect(config.namespaces).toEqual({
        "/": {
          emission: {},
          hooks: {},
          metadata: expect.any(z.ZodObject),
          examples: {},
        },
      });
    });
  });
});
