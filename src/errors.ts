import { ZodError } from "zod/v4";
import type { $ZodType } from "zod/v4/core";
import { getMessageFromError } from "./common-helpers";

/** @desc An error related to the input and output schemas declaration */
export class IOSchemaError extends Error {
  public override name = "IOSchemaError";
}

export class DeepCheckError extends IOSchemaError {
  public override name = "DeepCheckError";

  constructor(public override readonly cause: $ZodType) {
    super("Found", { cause });
  }
}

/** @desc An error of validating the incoming data */
export class InputValidationError extends IOSchemaError {
  public override name = "InputValidationError";

  constructor(public readonly originalError: ZodError) {
    super(getMessageFromError(originalError));
  }
}

/** @desc An error of validating the outgoing data */
export class OutputValidationError extends IOSchemaError {
  public override name = "OutputValidationError";

  constructor(public readonly originalError: ZodError) {
    super(getMessageFromError(originalError));
  }
}
