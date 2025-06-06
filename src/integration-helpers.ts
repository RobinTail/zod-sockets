import { range } from "ramda"; // @todo add eslint import concern
import ts from "typescript";
import { globalRegistry, z } from "zod/v4";

export const f = ts.factory;
export const exportModifier = [f.createModifier(ts.SyntaxKind.ExportKeyword)];

/**
 * @link https://github.com/colinhacks/zod/issues/4143#issuecomment-2845134912
 * @todo consider moving
 * */
const functionSchema = <T extends z.core.$ZodFunction>(schema: T) =>
  z.custom<Parameters<T["implement"]>[0]>((fn) =>
    schema.implement(fn as Parameters<T["implement"]>[0]),
  );

export const makeEventFnSchema = (
  base: z.ZodTuple,
  ack?: z.ZodTuple,
  maxOverloads: number = 3,
) => {
  if (!ack) {
    return z.function({ input: base, output: z.void() });
  }
  const fn = z.function({ input: ack, output: z.void() });
  const rest = base._zod.def.rest;
  if (!rest || maxOverloads <= 0) {
    return z.function({
      input: [...base._zod.def.items, functionSchema(fn)],
      output: z.void(),
    });
  }
  const restDesc = globalRegistry.get(rest)?.description;
  const variants = range(0, maxOverloads).map((count) => {
    const items = [...base._zod.def.items]
      .concat(
        range(1, count + 1).map((index) => {
          const copy = z.clone(rest);
          globalRegistry.add(copy, {
            description: `${restDesc || "rest"}${index}`,
          });
          return copy;
        }),
      )
      .concat(functionSchema(fn));
    return z.function({
      input: items,
      output: z.void(),
    });
  });
  return z.union(
    variants as unknown as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]],
  );
};
