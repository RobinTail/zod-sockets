import type { $InferInnerFunctionType } from "zod/v4/core";
import { z } from "zod/v4";

/** @link https://github.com/colinhacks/zod/issues/4143#issuecomment-2931729793 */
export const functionSchema = <IN extends z.ZodTuple, OUT extends z.ZodType>(
  input: IN,
  output: OUT,
  params?: { path?: PropertyKey[] },
): z.ZodType<(...args: z.output<IN>) => z.output<OUT>> => {
  const schema = z.function({ input, output });
  return z.custom().transform((arg, ctx) => {
    if (typeof arg !== "function") {
      ctx.addIssue({ ...params, message: "Expected function" });
      return z.NEVER;
    }
    return schema.implement(arg as $InferInnerFunctionType<IN, OUT>);
  });
};
