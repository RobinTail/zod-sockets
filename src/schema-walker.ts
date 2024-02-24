import { z } from "zod";

interface VariantDependingProps<U> {
  regular: { next: (schema: z.ZodTypeAny) => U };
  each: { prev: U };
  last: {};
}

export type HandlingVariant = keyof VariantDependingProps<unknown>;

type SchemaHandlingProps<
  T extends z.ZodTypeAny,
  U,
  Context extends object,
  Variant extends HandlingVariant,
> = Context &
  VariantDependingProps<U>[Variant] & {
    schema: T;
  };

export type SchemaHandler<
  T extends z.ZodTypeAny,
  U,
  Context extends object = {},
  Variant extends HandlingVariant = "regular",
> = (params: SchemaHandlingProps<T, U, Context, Variant>) => U;

export type HandlingRules<U, Context extends object = {}> = Partial<
  Record<
    z.ZodFirstPartyTypeKind,
    SchemaHandler<any, U, Context> // keeping "any" here in order to avoid excessive complexity
  >
>;

/** @since 10.1.1 calling onEach _after_ handler and giving it the previously achieved result */
export const walkSchema = <U extends object, Context extends object = {}>({
  schema,
  onEach,
  rules,
  onMissing,
  ...rest
}: SchemaHandlingProps<z.ZodTypeAny, U, Context, "last"> & {
  onEach?: SchemaHandler<z.ZodTypeAny, U, Context, "each">;
  rules: HandlingRules<U, Context>;
  onMissing: SchemaHandler<z.ZodTypeAny, U, Context, "last">;
}): U => {
  const handler = rules[schema._def.typeName as keyof typeof rules];
  const ctx = rest as unknown as Context;
  const next = (subject: z.ZodTypeAny) =>
    walkSchema({ schema: subject, ...ctx, onEach, rules, onMissing });
  const result = handler
    ? handler({ schema, ...ctx, next })
    : onMissing({ schema, ...ctx });
  const overrides = onEach && onEach({ schema, prev: result, ...ctx });
  return overrides ? { ...result, ...overrides } : result;
};
