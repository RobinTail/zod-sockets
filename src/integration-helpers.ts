import { range } from "ramda";
import ts from "typescript";
import { z } from "zod";

export const f = ts.factory;
export const exportModifier = [f.createModifier(ts.SyntaxKind.ExportKeyword)];

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
  const variants = range(0, maxOverloads).map((count) => {
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
