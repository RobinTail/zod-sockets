import { z } from "zod/v4";
import {
  InputValidationError,
  OutputValidationError,
  IOSchemaError,
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

  describe("InputValidationError", () => {
    const zodError = new z.ZodError([]);

    test("should be an instance of IOSchemaError and Error", () => {
      expect(new InputValidationError(zodError)).toBeInstanceOf(IOSchemaError);
      expect(new InputValidationError(zodError)).toBeInstanceOf(Error);
    });

    test("should have the name matching its class", () => {
      expect(new InputValidationError(zodError).name).toBe(
        "InputValidationError",
      );
    });

    test("should have .cause property matching the one used for constructing", () => {
      expect(new InputValidationError(zodError).cause).toEqual(zodError);
    });
  });

  describe("OutputValidationError", () => {
    const zodError = new z.ZodError([]);

    test("should be an instance of IOSchemaError and Error", () => {
      expect(new OutputValidationError(zodError)).toBeInstanceOf(IOSchemaError);
      expect(new OutputValidationError(zodError)).toBeInstanceOf(Error);
    });

    test("should have the name matching its class", () => {
      expect(new OutputValidationError(zodError).name).toBe(
        "OutputValidationError",
      );
    });

    test("should have .cause property matching th ones used for constructing", () => {
      expect(new OutputValidationError(zodError).cause).toEqual(zodError);
    });
  });
});
