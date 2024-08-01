import { describe, expect, test } from "vitest";
import { ZodError } from "zod";
import {
  InputValidationError,
  IOSchemaError,
  OutputValidationError,
} from "./errors";

describe("Errors", () => {
  describe("IOSchemaError", () => {
    test("should be an instance of Error", () => {
      expect(new IOSchemaError("test")).toBeInstanceOf(Error);
    });

    test("should have the name matching its class", () => {
      expect(new IOSchemaError("test").name).toBe("IOSchemaError");
    });
  });

  describe("OutputValidationError", () => {
    const zodError = new ZodError([]);

    test("should be an instance of IOSchemaError and Error", () => {
      expect(new OutputValidationError(zodError)).toBeInstanceOf(IOSchemaError);
      expect(new OutputValidationError(zodError)).toBeInstanceOf(Error);
    });

    test("should have the name matching its class", () => {
      expect(new OutputValidationError(zodError).name).toBe(
        "OutputValidationError",
      );
    });

    test("should have .originalError property matching the one used for constructing", () => {
      expect(new OutputValidationError(zodError).originalError).toEqual(
        zodError,
      );
    });
  });

  describe("InputValidationError", () => {
    const zodError = new ZodError([]);

    test("should be an instance of IOSchemaError and Error", () => {
      expect(new InputValidationError(zodError)).toBeInstanceOf(IOSchemaError);
      expect(new InputValidationError(zodError)).toBeInstanceOf(Error);
    });

    test("should have the name matching its class", () => {
      expect(new InputValidationError(zodError).name).toBe(
        "InputValidationError",
      );
    });

    test("should have .originalError property matching the one used for constructing", () => {
      expect(new InputValidationError(zodError).originalError).toEqual(
        zodError,
      );
    });
  });
});
