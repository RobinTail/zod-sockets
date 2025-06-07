import { z } from "zod/v4";
import type { $ZodTransform } from "zod/v4/core";
import * as R from "ramda";

export type EmptyObject = Record<string, never>;
export type FlatObject = Record<string, unknown>;

export const getTransformedType = R.tryCatch(
  <T>(schema: $ZodTransform<unknown, T>, sample: T) =>
    typeof z.parse(schema, sample),
  R.always(undefined),
);

export const ucFirst = (subject: string) =>
  subject.charAt(0).toUpperCase() + subject.slice(1).toLowerCase();

export const lcFirst = (subject: string) =>
  subject.charAt(0).toLowerCase() + subject.slice(1);

export const makeCleanId = (...args: string[]) =>
  args
    .flatMap((entry) => entry.split(/[^A-Z0-9]/gi)) // split by non-alphanumeric characters
    .flatMap((entry) =>
      // split by sequences of capitalized letters
      entry.replaceAll(/[A-Z]+/g, (beginning) => `/${beginning}`).split("/"),
    )
    .map(ucFirst)
    .join("");

export const makeErrorFromAnything = (subject: unknown): Error =>
  subject instanceof Error ? subject : new Error(String(subject));

export const getMessageFromError = (error: Error): string => {
  if (error instanceof z.ZodError) {
    return error.issues
      .map(({ path, message }) =>
        (path.length ? [path.join("/")] : []).concat(message).join(": "),
      )
      .join("; ");
  }
  return error.message;
};
