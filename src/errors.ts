import { ZodError } from "zod";
import { getMessageFromError } from "./common-helpers";

/** @desc An error related to the input and output schemas declaration */
export class IOSchemaError extends Error {
  public override name = "IOSchemaError";
}

/** @desc An error of validating the data against the Emission schema */
export class ActionError extends IOSchemaError {
  public override name = "ActionError";

  constructor(public readonly originalError: ZodError) {
    super(getMessageFromError(originalError));
  }
}

/** @desc An error of validating the data against an acknowledgement schema either of Action or Emission */
export class AckError extends IOSchemaError {
  public override name = "AckError";

  constructor(public readonly originalError: ZodError) {
    super(getMessageFromError(originalError));
  }
}
