import { ZodError } from "zod";
import { getMessageFromError } from "./common-helpers";

/** @desc An error related to the input and output schemas declaration */
export class IOSchemaError extends Error {
  public override name = "IOSchemaError";
}

/** @desc An error of validating the outgoing data */
export class OutputValidationError extends IOSchemaError {
  public override name = "OutputValidationError";

  constructor(public readonly originalError: ZodError) {
    super(getMessageFromError(originalError));
  }
}

/** @desc An error of validating the incoming data */
export class InputValidationError extends IOSchemaError {
  public override name = "InputValidationError";

  constructor(public readonly originalError: ZodError) {
    super(getMessageFromError(originalError));
  }
}
