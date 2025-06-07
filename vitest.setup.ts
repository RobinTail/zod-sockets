import { expect } from "vitest";
import type { NewPlugin } from "@vitest/pretty-format";
import { z } from "zod/v4";
import { InputValidationError, OutputValidationError } from "./src";

/** Takes cause and certain props of custom errors into account */
const errorSerializer: NewPlugin = {
  test: (subject) => subject instanceof Error,
  serialize: (error: Error, config, indentation, depth, refs, printer) => {
    const { name, message, cause } = error;
    const { originalError } =
      error instanceof InputValidationError ||
      error instanceof OutputValidationError
        ? error
        : {};
    const { issues } = error instanceof z.ZodError ? error : {};
    const obj = Object.assign(
      issues ? { issues } : { message },
      cause && { cause },
      originalError && { originalError },
    );
    return `${name}(${printer(obj, config, indentation, depth, refs)})`;
  },
};

expect.addSnapshotSerializer(errorSerializer);
