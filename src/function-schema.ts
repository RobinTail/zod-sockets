import { z } from "zod";
import { isSchema } from "./common-helpers";
import { getBrand, pack, unpack } from "@express-zod-api/zod-plugin";

export const fnBrand = Symbol.for("Function");

/** @link https://github.com/colinhacks/zod/issues/4143#issuecomment-2931729793 */
export const functionSchema = <
  IN extends z.core.$ZodTuple,
  OUT extends z.core.$ZodType,
>(
  input: IN,
  output: OUT,
  params?: { path?: PropertyKey[] },
) => {
  const template = z.function({ input, output });
  const schema = z.custom().transform((arg, ctx) => {
    if (typeof arg !== "function") {
      ctx.addIssue({
        ...params,
        code: "custom",
        message: `Expected function, received ${typeof ctx.value}`,
      });
      return z.NEVER;
    }
    return template.implement(arg as z.core.$InferInnerFunctionType<IN, OUT>);
  }) as z.ZodType<(...args: z.output<IN>) => z.output<OUT>>;
  return pack(schema.brand(fnBrand), { input, output });
};

export type FunctionSchema = ReturnType<typeof functionSchema>;

export const isFunctionSchema = (
  subject: z.core.$ZodType,
): subject is FunctionSchema => {
  if (getBrand(subject) !== fnBrand) return false;
  const { input, output } = unpack(subject);
  return isSchema<z.core.$ZodTuple>(input, "tuple") && isSchema(output);
};
