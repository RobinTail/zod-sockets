import * as R from "ramda";
import { globalRegistry, z } from "zod";

const squeeze = (...schemas: z.core.$ZodType[]) =>
  schemas as [z.core.$ZodType, ...z.core.$ZodType[]];

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
      input: z.tuple(squeeze(...base._zod.def.items, fn)),
      output: z.void(),
    });
  }
  const restDesc = globalRegistry.get(rest)?.description;
  const variants = R.range(0, maxOverloads).map((count) => {
    const items = [...base._zod.def.items]
      .concat(
        R.range(1, count + 1).map((index) => {
          const copy = z.clone(rest);
          globalRegistry.add(copy, {
            description: `${restDesc || "rest"}${index}`,
          });
          return copy;
        }),
      )
      .concat(fn);
    return z.function({ input: z.tuple(squeeze(...items)), output: z.void() });
  });
  return z.union(variants);
};

/** not using cycle:"throw" because it also affects parenting objects */
export const hasCycle = (
  subject: z.core.$ZodType,
  { io }: { io: "input" | "output" },
) => {
  const json = z.toJSONSchema(subject, {
    io,
    unrepresentable: "any",
    override: ({ jsonSchema }) => {
      if (typeof jsonSchema.default === "bigint") delete jsonSchema.default;
    },
  });
  const stack: unknown[] = [json];
  while (stack.length) {
    const entry = stack.shift()!;
    if (R.is(Object, entry)) {
      if ((entry as z.core.JSONSchema.BaseSchema).$ref === "#") return true;
      stack.push(...R.values(entry));
    }
    if (R.is(Array, entry)) stack.push(...R.values(entry));
  }
  return false;
};
