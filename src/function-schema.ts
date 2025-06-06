import type { $ZodCustomParams, $ZodFunction } from "zod/v4/core";
import { z } from "zod/v4";

/** @link https://github.com/colinhacks/zod/issues/4143#issuecomment-2845134912 */
export const functionSchema = <T extends $ZodFunction>(
  schema: T,
  params?: $ZodCustomParams,
) =>
  z.custom<Parameters<T["implement"]>[0]>(
    (fn) => schema.implement(fn as Parameters<T["implement"]>[0]),
    params,
  );
