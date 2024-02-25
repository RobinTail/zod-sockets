import { createHash } from "node:crypto";
import { range } from "ramda";
import ts from "typescript";
import { z } from "zod";

export const f = ts.factory;
export const exportModifier = [f.createModifier(ts.SyntaxKind.ExportKeyword)];

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

export const defaultSerializer = (schema: z.ZodTypeAny): string =>
  createHash("sha1").update(JSON.stringify(schema), "utf8").digest("hex");

export const makeEventFnSchema = (
  base: z.AnyZodTuple,
  ack?: z.AnyZodTuple,
  maxOverloads: number = 3,
) => {
  if (!ack) {
    return z.function(base, z.void());
  }
  const fn = z.function(ack, z.void());
  const rest = base._def.rest;
  if (!rest || maxOverloads <= 0) {
    return z.function(z.tuple([...base.items, fn]), z.void());
  }
  const variants = range(0, maxOverloads + 1).map((count) => {
    const items = [...base.items]
      .concat(
        range(1, count + 1).map((index) =>
          rest.describe(`${rest.description || "rest"}${index}`),
        ),
      )
      .concat(fn);
    return z.function(z.tuple(items as z.ZodTupleItems), z.void());
  });
  return z.union(
    variants as unknown as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]],
  );
};
/**
 * @desc isNullable() and isOptional() validate the schema's input
 * @desc They always return true in case of coercion, which should be taken into account when depicting response
 */
export const hasCoercion = (schema: z.ZodTypeAny): boolean =>
  "coerce" in schema._def && typeof schema._def.coerce === "boolean"
    ? schema._def.coerce
    : false;

export const tryToTransform = <T>(
  schema: z.ZodEffects<z.ZodTypeAny, T>,
  sample: T,
) => {
  try {
    return typeof schema.parse(sample);
  } catch (e) {
    return undefined;
  }
};
