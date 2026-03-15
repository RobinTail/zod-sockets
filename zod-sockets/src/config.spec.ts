import { z } from "zod";
import { Config, createSimpleConfig } from "./config";

describe("Config", () => {
  describe("::constructor", () => {
    test("should create config without any argument", () => {
      const config = new Config();
      expect(config).toBeInstanceOf(Config);
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
            security: [],
          },
          test: {
            emission: {},
            hooks: {},
            metadata: z.object({}),
            security: [],
          },
        },
        timeout: 3000,
      });
      expect(config).toBeInstanceOf(Config);
      expect(config.timeout).toBe(3000);
      expect(config.namespaces).toEqual({
        "/": {
          emission: {},
          hooks: {},
          metadata: expect.any(z.ZodObject),
          security: [],
        },
        test: {
          emission: {},
          hooks: {},
          metadata: expect.any(z.ZodObject),
          security: [],
        },
      });
    });
  });

  describe(".addNamespace()", () => {
    test("should provide namespace augmentation method", () => {
      const base = new Config();
      expect(base).toBeInstanceOf(Config);
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
          security: [],
        },
      });
    });
  });

  describe("createSimpleConfig()", () => {
    test("should set defaults", () => {
      const config = createSimpleConfig();
      expect(config).toBeInstanceOf(Config);
      expect(config.timeout).toBe(2000);
      expect(config.namespaces).toEqual({
        "/": {
          emission: {},
          hooks: {},
          metadata: expect.any(z.ZodObject),
          security: [],
        },
      });
    });

    test("should set the root namespace properties", () => {
      const config = createSimpleConfig({
        timeout: 3000,
        emission: {},
        hooks: {},
        metadata: z.object({}),
      });
      expect(config).toBeInstanceOf(Config);
      expect(config.timeout).toBe(3000);
      expect(config.namespaces).toEqual({
        "/": {
          emission: {},
          hooks: {},
          metadata: expect.any(z.ZodObject),
          security: [],
        },
      });
    });
  });
});
