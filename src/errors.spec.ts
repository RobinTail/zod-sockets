import { describe, expect, test } from "vitest";
import { ZodError } from "zod";
import { ActionError, AckError, IOSchemaError } from "./errors";

describe("Errors", () => {
  describe("IOSchemaError", () => {
    test("should be an instance of Error", () => {
      expect(new IOSchemaError("test")).toBeInstanceOf(Error);
    });

    test("should have the name matching its class", () => {
      expect(new IOSchemaError("test").name).toBe("IOSchemaError");
    });
  });

  describe("ActionError", () => {
    const zodError = new ZodError([]);

    test("should be an instance of IOSchemaError and Error", () => {
      expect(new ActionError(zodError)).toBeInstanceOf(IOSchemaError);
      expect(new ActionError(zodError)).toBeInstanceOf(Error);
    });

    test("should have the name matching its class", () => {
      expect(new ActionError(zodError).name).toBe("ActionError");
    });

    test("should have .originalError property matching the one used for constructing", () => {
      expect(new ActionError(zodError).originalError).toEqual(zodError);
    });
  });

  describe("AckError", () => {
    const zodError = new ZodError([]);

    test("should be an instance of IOSchemaError and Error", () => {
      expect(new AckError(zodError)).toBeInstanceOf(IOSchemaError);
      expect(new AckError(zodError)).toBeInstanceOf(Error);
    });

    test("should have the name matching its class", () => {
      expect(new AckError(zodError).name).toBe("AckError");
    });

    test("should have .originalError property matching th ones used for constructing", () => {
      expect(new AckError(zodError).originalError).toEqual(zodError);
    });
  });
});
