import { describe, expect, test } from "vitest";
import { ZodError } from "zod";
import { ActionError, AckError, IOSchemaError, EmissionError } from "./errors";

describe("Errors", () => {
  describe("IOSchemaError", () => {
    test("should be an instance of Error", () => {
      expect(new IOSchemaError("test")).toBeInstanceOf(Error);
    });

    test("should have the name matching its class", () => {
      expect(new IOSchemaError("test").name).toBe("IOSchemaError");
    });
  });

  describe.each([ActionError, EmissionError])("EmissionError", (Subject) => {
    const zodError = new ZodError([]);

    test("should be an instance of IOSchemaError and Error", () => {
      expect(new Subject(zodError)).toBeInstanceOf(IOSchemaError);
      expect(new Subject(zodError)).toBeInstanceOf(Error);
    });

    test("should have the name matching its class", () => {
      expect(new Subject(zodError).name).toBe(Subject.name);
    });

    test("should have .originalError property matching the one used for constructing", () => {
      expect(new Subject(zodError).originalError).toEqual(zodError);
    });
  });

  describe.each(["action", "emission"] as const)("AckError", (kind) => {
    const zodError = new ZodError([]);

    test("should be an instance of IOSchemaError and Error", () => {
      expect(new AckError(kind, zodError)).toBeInstanceOf(IOSchemaError);
      expect(new AckError(kind, zodError)).toBeInstanceOf(Error);
    });

    test("should have the name matching its class", () => {
      expect(new AckError(kind, zodError).name).toBe("AckError");
    });

    test("should have public properties matching the ones used for constructing", () => {
      expect(new AckError(kind, zodError).originalError).toEqual(zodError);
      expect(new AckError(kind, zodError).kind).toEqual(kind);
    });
  });
});
