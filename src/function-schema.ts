import type { $InferInnerFunctionType, $ZodType, $ZodTuple } from "zod/v4/core";
import { z } from "zod/v4";
import { isSchema } from "./common-helpers";

interface FunctionBag<IN extends $ZodTuple, OUT extends $ZodType> {
  brand: "function";
  input: IN;
  output: OUT;
}

export type FunctionSchema<
  IN extends $ZodTuple = $ZodTuple,
  OUT extends $ZodType = $ZodType,
> = z.ZodType<(...args: z.output<IN>) => z.output<OUT>> & {
  _zod: {
    bag: FunctionBag<IN, OUT>;
  };
};

/** @link https://github.com/colinhacks/zod/issues/4143#issuecomment-2931729793 */
export const functionSchema = <IN extends $ZodTuple, OUT extends $ZodType>(
  input: IN,
  output: OUT,
  params?: { path?: PropertyKey[] },
) => {
  const template = z.function({ input, output });
  const schema = z.custom().transform((arg, ctx) => {
    if (typeof arg !== "function") {
      ctx.addIssue({
        ...params,
        message: `Expected function, received ${typeof ctx.value}`,
      });
      return z.NEVER;
    }
    return template.implement(arg as $InferInnerFunctionType<IN, OUT>);
  });
  Object.assign(schema._zod.bag, {
    brand: "function",
    input,
    output,
  } satisfies FunctionBag<IN, OUT>);
  return schema as unknown as FunctionSchema<IN, OUT>;
};

export const isFunctionSchema = (
  subject: $ZodType,
): subject is FunctionSchema =>
  subject._zod.bag.brand === "function" &&
  isSchema<$ZodTuple>(subject._zod.bag.input, "tuple") &&
  isSchema(subject._zod.bag.output);
