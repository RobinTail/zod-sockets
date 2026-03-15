import { z } from "zod";
import * as R from "ramda";

export type EmptyObject = Record<string, never>;
export type FlatObject = Record<string, unknown>;

export const getTransformedType = R.tryCatch(
  <T>(schema: z.core.$ZodTransform<unknown, T>, sample: T) =>
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

export const ensureError = (subject: unknown): Error =>
  subject instanceof Error
    ? subject
    : subject instanceof z.ZodError // ZodError does not extend Error, unlike ZodRealError that does
      ? new z.ZodRealError(subject.issues)
      : new Error(String(subject));

export const getMessageFromError = (error: Error): string => {
  if (error instanceof z.ZodError) {
    return error.issues
      .map(({ path, message }) => {
        const prefix = path.length ? `${z.core.toDotPath(path)}: ` : "";
        return `${prefix}${message}`;
      })
      .join("; ");
  }
  return error.message;
};

/** Faster replacement to instanceof for code operating core types (traversing schemas) */
export const isSchema = <T extends z.core.$ZodType = z.core.$ZodType>(
  subject: unknown,
  type?: T["_zod"]["def"]["type"],
): subject is T =>
  isObject(subject) &&
  "_zod" in subject &&
  (type ? R.path(["_zod", "def", "type"], subject) === type : true);

/** @desc can still be an array, use Array.isArray() or rather R.type() to exclude that case */
export const isObject = (subject: unknown) =>
  typeof subject === "object" && subject !== null;
