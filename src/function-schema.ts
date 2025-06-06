import { z } from "zod/v4";

/** @link https://github.com/colinhacks/zod/issues/4143#issuecomment-2845134912 */
export const functionSchema = <T extends z.core.$ZodFunction>(schema: T) =>
  z.custom<Parameters<T["implement"]>[0]>((fn) =>
    schema.implement(fn as Parameters<T["implement"]>[0]),
  );
