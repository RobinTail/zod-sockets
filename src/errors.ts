import { z } from "zod/v4";
import { getMessageFromError } from "./common-helpers";

/** @desc An error related to the input and output schemas declaration */
export class IOSchemaError extends Error {
  public override name = "IOSchemaError";
}

/** @desc An error of validating the incoming data */
export class InputValidationError extends IOSchemaError {
  public override name = "InputValidationError";

  constructor(public override readonly cause: z.ZodError) {
    super(getMessageFromError(cause), { cause });
  }
}

/** @desc An error of validating the outgoing data */
export class OutputValidationError extends IOSchemaError {
  public override name = "OutputValidationError";

  constructor(public override readonly cause: z.ZodError) {
    const prefixedPath = new z.ZodError(
      cause.issues.map(({ path, ...rest }) => ({
        ...rest,
        path: ["output", ...path],
      })),
    );
    super(getMessageFromError(prefixedPath), { cause });
  }
}
