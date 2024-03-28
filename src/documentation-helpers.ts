import assert from "node:assert/strict";
import {
  ReferenceObject,
  SchemaObject,
  SchemaObjectType,
  isReferenceObject,
} from "openapi3-ts/oas31";
import {
  concat,
  fromPairs,
  map,
  mergeDeepWith,
  range,
  union,
  xprod,
} from "ramda";
import { z } from "zod";
import { hasCoercion, tryToTransform } from "./common-helpers";
import { HandlingRules, HandlingVariant, SchemaHandler } from "./schema-walker";

/* eslint-disable @typescript-eslint/no-use-before-define */

export interface AsyncAPIContext {
  direction: "in" | "out";
}

type Depicter<
  T extends z.ZodTypeAny,
  Variant extends HandlingVariant = "regular",
> = SchemaHandler<T, SchemaObject | ReferenceObject, AsyncAPIContext, Variant>;

const samples = {
  integer: 0,
  number: 0,
  string: "",
  boolean: false,
  object: {},
  null: null,
  array: [],
} satisfies Record<Extract<SchemaObjectType, string>, unknown>;

export const depictDefault: Depicter<z.ZodDefault<z.ZodTypeAny>> = ({
  schema: {
    _def: { innerType, defaultValue },
  },
  next,
}) => ({ ...next(innerType), default: defaultValue() });

export const depictCatch: Depicter<z.ZodCatch<z.ZodTypeAny>> = ({
  schema: {
    _def: { innerType },
  },
  next,
}) => next(innerType);

export const depictAny: Depicter<z.ZodAny> = () => ({
  format: "any",
});

export const depictUnion: Depicter<z.ZodUnion<z.ZodUnionOptions>> = ({
  schema: { options },
  next,
}) => ({ oneOf: options.map(next) });

export const depictDiscriminatedUnion: Depicter<
  z.ZodDiscriminatedUnion<string, z.ZodDiscriminatedUnionOption<string>[]>
> = ({ schema: { options, discriminator }, next }) => {
  return {
    discriminator: { propertyName: discriminator },
    oneOf: Array.from(options.values()).map(next),
  };
};

/** @throws AssertionError */
const tryFlattenIntersection = (
  children: Array<SchemaObject | ReferenceObject>,
) => {
  const [left, right] = children.filter(
    (entry): entry is SchemaObject =>
      !isReferenceObject(entry) &&
      entry.type === "object" &&
      Object.keys(entry).every((key) =>
        ["type", "properties", "required", "examples"].includes(key),
      ),
  );
  assert(left && right, "Can not flatten objects");
  const flat: SchemaObject = { type: "object" };
  if (left.properties || right.properties) {
    flat.properties = mergeDeepWith(
      (a, b) =>
        Array.isArray(a) && Array.isArray(b)
          ? concat(a, b)
          : a === b
            ? b
            : assert.fail("Can not flatten properties"),
      left.properties || {},
      right.properties || {},
    );
  }
  if (left.required || right.required) {
    flat.required = union(left.required || [], right.required || []);
  }
  return flat;
};

export const depictIntersection: Depicter<
  z.ZodIntersection<z.ZodTypeAny, z.ZodTypeAny>
> = ({
  schema: {
    _def: { left, right },
  },
  next,
}) => {
  const children = [left, right].map(next);
  try {
    return tryFlattenIntersection(children);
  } catch {}
  return { allOf: children };
};

export const depictOptional: Depicter<z.ZodOptional<z.ZodTypeAny>> = ({
  schema,
  next,
}) => next(schema.unwrap());

export const depictReadonly: Depicter<z.ZodReadonly<z.ZodTypeAny>> = ({
  schema,
  next,
}) => next(schema._def.innerType);

/** @since OAS 3.1 nullable replaced with type array having null */
export const depictNullable: Depicter<z.ZodNullable<z.ZodTypeAny>> = ({
  schema,
  next,
}) => {
  const nested = next(schema.unwrap());
  if (!isReferenceObject(nested)) {
    nested.type = makeNullableType(nested);
  }
  return nested;
};

export const depictEnum: Depicter<
  z.ZodEnum<[string, ...string[]]> | z.ZodNativeEnum<any> // keeping "any" for ZodNativeEnum as compatibility fix
> = ({ schema }) => ({
  type: typeof Object.values(schema.enum)[0] as "string" | "number",
  enum: Object.values(schema.enum),
});

export const depictLiteral: Depicter<z.ZodLiteral<unknown>> = ({
  schema: { value },
}) => ({
  type: typeof value as "string" | "number" | "boolean",
  enum: [value],
});

export const depictObject: Depicter<z.ZodObject<z.ZodRawShape>> = ({
  schema,
  direction,
  ...rest
}) => {
  const keys = Object.keys(schema.shape);
  const isOptionalProp = (prop: z.ZodTypeAny) =>
    direction === "out" && hasCoercion(prop)
      ? prop instanceof z.ZodOptional
      : prop.isOptional();
  const required = keys.filter((key) => !isOptionalProp(schema.shape[key]));
  const result: SchemaObject = { type: "object" };
  if (keys.length) {
    result.properties = depictObjectProperties({ schema, direction, ...rest });
  }
  if (required.length) {
    result.required = required;
  }
  return result;
};

/**
 * @see https://swagger.io/docs/specification/data-models/data-types/
 * @since OAS 3.1: using type: "null"
 * */
export const depictNull: Depicter<z.ZodNull> = () => ({ type: "null" });

export const depictBoolean: Depicter<z.ZodBoolean> = () => ({
  type: "boolean",
});

export const depictBigInt: Depicter<z.ZodBigInt> = () => ({
  type: "integer",
  format: "bigint",
});

const areOptionsLiteral = (
  subject: z.ZodTypeAny[],
): subject is z.ZodLiteral<unknown>[] =>
  subject.every((option) => option instanceof z.ZodLiteral);

export const depictRecord: Depicter<z.ZodRecord<z.ZodTypeAny>> = ({
  schema: { keySchema, valueSchema },
  ...rest
}) => {
  if (keySchema instanceof z.ZodEnum || keySchema instanceof z.ZodNativeEnum) {
    const keys = Object.values(keySchema.enum) as string[];
    const result: SchemaObject = { type: "object" };
    if (keys.length) {
      result.properties = depictObjectProperties({
        schema: z.object(fromPairs(xprod(keys, [valueSchema]))),
        ...rest,
      });
      result.required = keys;
    }
    return result;
  }
  if (keySchema instanceof z.ZodLiteral) {
    return {
      type: "object",
      properties: depictObjectProperties({
        schema: z.object({ [keySchema.value]: valueSchema }),
        ...rest,
      }),
      required: [keySchema.value],
    };
  }
  if (keySchema instanceof z.ZodUnion && areOptionsLiteral(keySchema.options)) {
    const required = map((opt) => `${opt.value}`, keySchema.options);
    const shape = fromPairs(xprod(required, [valueSchema]));
    return {
      type: "object",
      properties: depictObjectProperties({ schema: z.object(shape), ...rest }),
      required,
    };
  }
  return { type: "object", additionalProperties: rest.next(valueSchema) };
};

export const depictArray: Depicter<z.ZodArray<z.ZodTypeAny>> = ({
  schema: { _def: def, element },
  next,
}) => {
  const result: SchemaObject = { type: "array", items: next(element) };
  if (def.minLength) {
    result.minItems = def.minLength.value;
  }
  if (def.maxLength) {
    result.maxItems = def.maxLength.value;
  }
  return result;
};

/**
 * @desc AsyncAPI does not support prefixItems, so tuples are depicted as objects with numeric properties
 * @todo use prefixItems when supported
 * */
export const depictTuple: Depicter<z.AnyZodTuple> = ({
  schema: {
    items,
    _def: { rest },
  },
  next,
}) => ({
  type: "object",
  format: "tuple",
  properties: items.reduce(
    (agg, item, index) => ({ ...agg, [index]: next(item) }),
    {},
  ),
  required: range(0, items.length).map(String),
  additionalProperties: rest === null ? false : next(rest),
});

export const depictString: Depicter<z.ZodString> = ({
  schema: {
    isEmail,
    isURL,
    minLength,
    maxLength,
    isUUID,
    isCUID,
    isCUID2,
    isULID,
    isIP,
    isEmoji,
    isDatetime,
    _def: { checks },
  },
}) => {
  const regexCheck = checks.find(
    (check): check is Extract<z.ZodStringCheck, { kind: "regex" }> =>
      check.kind === "regex",
  );
  const datetimeCheck = checks.find(
    (check): check is Extract<z.ZodStringCheck, { kind: "datetime" }> =>
      check.kind === "datetime",
  );
  const regex = regexCheck
    ? regexCheck.regex
    : datetimeCheck
      ? datetimeCheck.offset
        ? new RegExp(
            `^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?(([+-]\\d{2}:\\d{2})|Z)$`,
          )
        : new RegExp(`^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?Z$`)
      : undefined;
  const result: SchemaObject = { type: "string" };
  const formats: Record<NonNullable<SchemaObject["format"]>, boolean> = {
    "date-time": isDatetime,
    email: isEmail,
    url: isURL,
    uuid: isUUID,
    cuid: isCUID,
    cuid2: isCUID2,
    ulid: isULID,
    ip: isIP,
    emoji: isEmoji,
  };
  for (const format in formats) {
    if (formats[format]) {
      result.format = format;
      break;
    }
  }
  if (minLength !== null) {
    result.minLength = minLength;
  }
  if (maxLength !== null) {
    result.maxLength = maxLength;
  }
  if (regex) {
    result.pattern = regex.source;
  }
  return result;
};

/** @since OAS 3.1: exclusive min/max are numbers */
export const depictNumber: Depicter<z.ZodNumber> = ({ schema }) => {
  const minCheck = schema._def.checks.find(({ kind }) => kind === "min") as
    | Extract<z.ZodNumberCheck, { kind: "min" }>
    | undefined;
  const minimum =
    schema.minValue === null
      ? schema.isInt
        ? Number.MIN_SAFE_INTEGER
        : -Number.MAX_VALUE
      : schema.minValue;
  const isMinInclusive = minCheck ? minCheck.inclusive : true;
  const maxCheck = schema._def.checks.find(({ kind }) => kind === "max") as
    | Extract<z.ZodNumberCheck, { kind: "max" }>
    | undefined;
  const maximum =
    schema.maxValue === null
      ? schema.isInt
        ? Number.MAX_SAFE_INTEGER
        : Number.MAX_VALUE
      : schema.maxValue;
  const isMaxInclusive = maxCheck ? maxCheck.inclusive : true;
  const result: SchemaObject = {
    type: schema.isInt ? "integer" : "number",
    format: schema.isInt ? "int64" : "double",
  };
  if (isMinInclusive) {
    result.minimum = minimum;
  } else {
    result.exclusiveMinimum = minimum;
  }
  if (isMaxInclusive) {
    result.maximum = maximum;
  } else {
    result.exclusiveMaximum = maximum;
  }
  return result;
};

export const depictObjectProperties = ({
  schema: { shape },
  next,
}: Parameters<Depicter<z.ZodObject<z.ZodRawShape>>>[0]) => map(next, shape);

const makeSample = (depicted: SchemaObject) => {
  const type = (
    Array.isArray(depicted.type) ? depicted.type[0] : depicted.type
  ) as keyof typeof samples;
  return depicted.format === "date" ? new Date() : samples?.[type];
};

const makeNullableType = (prev: SchemaObject): SchemaObjectType[] => {
  const current = typeof prev.type === "string" ? [prev.type] : prev.type || [];
  if (current.includes("null")) {
    return current;
  }
  return current.concat("null");
};

export const depictEffect: Depicter<z.ZodEffects<z.ZodTypeAny>> = ({
  schema,
  direction,
  next,
}) => {
  const input = next(schema.innerType());
  const { effect } = schema._def;
  if (
    direction === "out" &&
    effect.type === "transform" &&
    !isReferenceObject(input)
  ) {
    const outputType = tryToTransform(schema, makeSample(input));
    if (outputType && ["number", "string", "boolean"].includes(outputType)) {
      return { type: outputType as "number" | "string" | "boolean" };
    } else {
      return next(z.any());
    }
  }
  if (
    direction === "in" &&
    effect.type === "preprocess" &&
    !isReferenceObject(input)
  ) {
    const { type: inputType, ...rest } = input;
    return {
      ...rest,
      format: `${rest.format || inputType} (preprocessed)`,
    };
  }
  return input;
};

export const depictPipeline: Depicter<
  z.ZodPipeline<z.ZodTypeAny, z.ZodTypeAny>
> = ({ schema, direction, next }) => next(schema._def[direction]);

export const depictBranded: Depicter<
  z.ZodBranded<z.ZodTypeAny, string | number | symbol>
> = ({ schema, next }) => next(schema.unwrap());

export const depictDate: Depicter<z.ZodDate> = () => ({
  format: "date",
});

export const depicters: HandlingRules<
  SchemaObject | ReferenceObject,
  AsyncAPIContext
> = {
  ZodString: depictString,
  ZodNumber: depictNumber,
  ZodBigInt: depictBigInt,
  ZodBoolean: depictBoolean,
  ZodNull: depictNull,
  ZodArray: depictArray,
  ZodTuple: depictTuple,
  ZodRecord: depictRecord,
  ZodObject: depictObject,
  ZodLiteral: depictLiteral,
  ZodIntersection: depictIntersection,
  ZodUnion: depictUnion,
  ZodAny: depictAny,
  ZodDefault: depictDefault,
  ZodEnum: depictEnum,
  ZodNativeEnum: depictEnum,
  ZodEffects: depictEffect,
  ZodOptional: depictOptional,
  ZodNullable: depictNullable,
  ZodDiscriminatedUnion: depictDiscriminatedUnion,
  ZodBranded: depictBranded,
  ZodCatch: depictCatch,
  ZodPipeline: depictPipeline,
  ZodReadonly: depictReadonly,
  ZodDate: depictDate,
  ZodUnknown: depictAny,
};

export const onEach: Depicter<z.ZodTypeAny, "each"> = ({
  schema,
  direction,
  prev,
}) => {
  if (isReferenceObject(prev)) {
    return {};
  }
  const { description } = schema;
  const hasTypePropertyInDepiction = prev.type !== undefined;
  const isResponseHavingCoercion = direction === "out" && hasCoercion(schema);
  const isActuallyNullable =
    hasTypePropertyInDepiction &&
    !isResponseHavingCoercion &&
    schema.isNullable();
  const result: SchemaObject = {};
  if (description) {
    result.description = description;
  }
  if (isActuallyNullable) {
    result.type = makeNullableType(prev);
  }
  return result;
};

export const onMissing: Depicter<z.ZodTypeAny, "last"> = ({ schema }) =>
  assert.fail(`Zod type ${schema.constructor.name} is unsupported.`);
