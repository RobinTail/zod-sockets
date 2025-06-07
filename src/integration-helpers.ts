import * as R from "ramda";
import { globalRegistry, z } from "zod/v4";
import type { $ZodType } from "zod/v4/core";
import { functionSchema } from "./function-schema";

const squeeze = (...schemas: $ZodType[]) =>
  schemas as [$ZodType, ...$ZodType[]];

export const makeEventFnSchema = (
  base: z.ZodTuple,
  ack?: z.ZodTuple,
  maxOverloads: number = 3,
) => {
  if (!ack) {
    return functionSchema(base, z.void());
  }
  const fn = functionSchema(ack, z.void());
  const rest = base._zod.def.rest;
  if (!rest || maxOverloads <= 0) {
    return functionSchema(
      z.tuple(squeeze(...base._zod.def.items, fn)),
      z.void(),
    );
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
    return functionSchema(z.tuple(squeeze(...items)), z.void());
  });
  return z.union(variants);
};
