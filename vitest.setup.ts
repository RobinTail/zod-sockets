import { expect } from "vitest";
import type { NewPlugin } from "@vitest/pretty-format";
import { z } from "zod/v4";
import type { $ZodType } from "zod/v4/core";
import { InputValidationError, OutputValidationError } from "./src";
import { isFunctionSchema } from "./src/function-schema";

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

const customSerializer = (entity: $ZodType) =>
  z.toJSONSchema(entity, {
    unrepresentable: "any",
    override: ({ zodSchema, jsonSchema }) => {
      if (isFunctionSchema(zodSchema)) {
        jsonSchema["x-brand"] = "function";
        jsonSchema["x-input"] = customSerializer(zodSchema._zod.bag.input);
        jsonSchema["x-output"] = customSerializer(zodSchema._zod.bag.output);
      }
    },
  });

const schemaSerializer: NewPlugin = {
  test: (subject) => subject instanceof z.ZodType,
  serialize: (entity: z.ZodType, config, indentation, depth, refs, printer) => {
    const serialization = customSerializer(entity);
    return printer(serialization, config, indentation, depth, refs);
  },
};

/**
 * @see https://github.com/vitest-dev/vitest/issues/5697
 * @see https://vitest.dev/guide/snapshot.html#custom-serializer
 */
const serializers = [errorSerializer, schemaSerializer];
for (const serializer of serializers) expect.addSnapshotSerializer(serializer);
