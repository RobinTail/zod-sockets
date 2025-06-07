import assert from "node:assert/strict";
import {
  concat,
  type as detectType,
  fromPairs,
  map,
  mergeDeepWith,
  toLower,
  union,
  xprod,
} from "ramda";
import { z } from "zod/v4";
import {
  MessageObject,
  OperationObject,
  ReferenceObject,
  SchemaObject,
  SchemaObjectType,
} from "./async-api/model";
import { isReferenceObject } from "./async-api/helpers";
import { FlatObject, hasCoercion, getTransformedType } from "./common-helpers";
import { HandlingRules, SchemaHandler, walkSchema } from "./schema-walker";

export interface AsyncAPIContext extends FlatObject {
  direction: "in" | "out";
}

type Depicter = SchemaHandler<SchemaObject | ReferenceObject, AsyncAPIContext>;

const samples = {
  integer: 0,
  number: 0,
  string: "",
  boolean: false,
  object: {},
  null: null,
  array: [],
} satisfies Record<Extract<SchemaObjectType, string>, unknown>;

export const depictDefault: Depicter = (
  { _def: { innerType, defaultValue } }: z.ZodDefault<z.ZodTypeAny>,
  { next },
) => ({ ...next(innerType), default: defaultValue() });

export const depictCatch: Depicter = (
  { _def: { innerType } }: z.ZodCatch<z.ZodTypeAny>,
  { next },
) => next(innerType);

export const depictAny: Depicter = () => ({ format: "any" });

export const depictUnion: Depicter = (
  { options }: z.ZodUnion<z.ZodUnionOptions>,
  { next },
) => ({ oneOf: options.map(next) });

export const depictDiscriminatedUnion: Depicter = (
  {
    options,
    discriminator,
  }: z.ZodDiscriminatedUnion<string, z.ZodDiscriminatedUnionOption<string>[]>,
  { next },
) => {
  return {
    discriminator,
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

export const depictIntersection: Depicter = (
  { _def: { left, right } }: z.ZodIntersection<z.ZodTypeAny, z.ZodTypeAny>,
  { next },
) => {
  const children = [left, right].map(next);
  try {
    return tryFlattenIntersection(children);
  } catch {}
  return { allOf: children };
};

export const depictOptional: Depicter = (
  schema: z.ZodOptional<z.ZodTypeAny>,
  { next },
) => next(schema.unwrap());

export const depictReadonly: Depicter = (
  schema: z.ZodReadonly<z.ZodTypeAny>,
  { next },
) => next(schema._def.innerType);

/** @since OAS 3.1 nullable replaced with type array having null */
export const depictNullable: Depicter = (
  schema: z.ZodNullable<z.ZodTypeAny>,
  { next },
) => {
  const nested = next(schema.unwrap());
  if (!isReferenceObject(nested)) {
    nested.type = makeNullableType(nested);
  }
  return nested;
};

const getSupportedType = (value: unknown): SchemaObjectType | undefined => {
  const detected = toLower(detectType(value)); // toLower is typed well unlike .toLowerCase()
  const isSupported =
    detected === "number" ||
    detected === "string" ||
    detected === "boolean" ||
    detected === "object" ||
    detected === "null" ||
    detected === "array";
  return typeof value === "bigint"
    ? "integer"
    : isSupported
      ? detected
      : undefined;
};

export const depictEnum: Depicter = (
  schema: z.ZodEnum<[string, ...string[]]> | z.ZodNativeEnum<z.EnumLike>,
) => ({
  type: getSupportedType(Object.values(schema.enum)[0]),
  enum: Object.values(schema.enum),
});

export const depictLiteral: Depicter = ({ value }: z.ZodLiteral<unknown>) => ({
  type: getSupportedType(value), // constructor allows z.Primitive only, but ZodLiteral does not have that constraint
  const: value,
});

export const depictObject: Depicter = (
  schema: z.ZodObject<z.ZodRawShape>,
  { direction, next },
) => {
  const keys = Object.keys(schema.shape);
  const isOptionalProp = (prop: z.ZodTypeAny) =>
    direction === "out" && hasCoercion(prop)
      ? prop instanceof z.ZodOptional
      : prop.isOptional();
  const required = keys.filter((key) => !isOptionalProp(schema.shape[key]));
  const result: SchemaObject = { type: "object" };
  if (keys.length) {
    result.properties = depictObjectProperties(schema, next);
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
export const depictNull: Depicter = () => ({ type: "null" });

export const depictBoolean: Depicter = () => ({ type: "boolean" });

export const depictBigInt: Depicter = () => ({
  type: "integer",
  format: "bigint",
});

const areOptionsLiteral = (
  subject: z.ZodTypeAny[],
): subject is z.ZodLiteral<unknown>[] =>
  subject.every((option) => option instanceof z.ZodLiteral);

export const depictRecord: Depicter = (
  { keySchema, valueSchema }: z.ZodRecord<z.ZodTypeAny>,
  { next },
) => {
  if (keySchema instanceof z.ZodEnum || keySchema instanceof z.ZodNativeEnum) {
    const keys = Object.values(keySchema.enum) as string[];
    const result: SchemaObject = { type: "object" };
    if (keys.length) {
      result.properties = depictObjectProperties(
        z.object(fromPairs(xprod(keys, [valueSchema]))),
        next,
      );
      result.required = keys;
    }
    return result;
  }
  if (keySchema instanceof z.ZodLiteral) {
    return {
      type: "object",
      properties: depictObjectProperties(
        z.object({ [keySchema.value]: valueSchema }),
        next,
      ),
      required: [keySchema.value],
    };
  }
  if (keySchema instanceof z.ZodUnion && areOptionsLiteral(keySchema.options)) {
    const required = map((opt) => `${opt.value}`, keySchema.options);
    const shape = fromPairs(xprod(required, [valueSchema]));
    return {
      type: "object",
      properties: depictObjectProperties(z.object(shape), next),
      required,
    };
  }
  return { type: "object", additionalProperties: next(valueSchema) };
};

export const depictArray: Depicter = (
  { _def: def, element }: z.ZodArray<z.ZodTypeAny>,
  { next },
) => {
  const result: SchemaObject = { type: "array", items: next(element) };
  if (def.minLength) {
    result.minItems = def.minLength.value;
  }
  if (def.maxLength) {
    result.maxItems = def.maxLength.value;
  }
  return result;
};

/** @desc AsyncAPI uses items of draft-07 instead of prefixItems */
export const depictTuple: Depicter = (
  { items, _def: { rest } }: z.AnyZodTuple,
  { next },
) => ({
  type: "array",
  items: items.length
    ? (items.map(next) as [SchemaObject, ...SchemaObject[]]) // ensured by length
    : undefined,
  additionalItems: rest === null ? false : next(rest),
});

export const depictString: Depicter = ({
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
}: z.ZodString) => {
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
export const depictNumber: Depicter = (schema: z.ZodNumber) => {
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

export const depictObjectProperties = (
  { shape }: z.ZodObject<z.ZodRawShape>,
  next: Parameters<Depicter>[1]["next"],
) => map(next, shape);

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

export const depictEffect: Depicter = (
  schema: z.ZodEffects<z.ZodTypeAny>,
  { direction, next },
) => {
  const input = next(schema.innerType());
  const { effect } = schema._def;
  if (
    direction === "out" &&
    effect.type === "transform" &&
    !isReferenceObject(input)
  ) {
    const outputType = getTransformedType(schema, makeSample(input));
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

export const depictPipeline: Depicter = (
  schema: z.ZodPipeline<z.ZodTypeAny, z.ZodTypeAny>,
  { direction, next },
) => next(schema._def[direction]);

export const depictBranded: Depicter = (
  schema: z.ZodBranded<z.ZodTypeAny, string | number | symbol>,
  { next },
) => next(schema.unwrap());

export const depictDate: Depicter = () => ({ format: "date" });

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

export const onEach: SchemaHandler<
  SchemaObject | ReferenceObject,
  AsyncAPIContext,
  "each"
> = (schema: z.ZodTypeAny, { direction, prev }) => {
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

export const onMissing: SchemaHandler<
  SchemaObject | ReferenceObject,
  AsyncAPIContext,
  "last"
> = (schema: z.ZodTypeAny) =>
  assert.fail(`Zod type ${schema.constructor.name} is unsupported.`);

/** @desc Add examples to the top level tuples */
export const withExamples = <T extends SchemaObject | ReferenceObject>(
  subject: T,
  examples?: unknown[][],
): T => {
  if (isReferenceObject(subject) || !examples) {
    return subject;
  }
  if (
    subject.type === "array" &&
    subject.items &&
    Array.isArray(subject.items)
  ) {
    for (const example of examples) {
      for (let index = 0; index < example.length; index++) {
        const item = subject.items[index];
        if (item && !isReferenceObject(item)) {
          item.examples = [...(item.examples || []), example[index]];
        }
      }
    }
  }
  return subject;
};

export const depictMessage = ({
  event,
  schema,
  examples,
  direction,
  isAck,
}: {
  event: string;
  schema: z.AnyZodTuple;
  examples?: z.infer<z.AnyZodTuple>[];
  isAck?: boolean;
} & AsyncAPIContext): MessageObject => ({
  name: isAck ? undefined : event,
  title: isAck ? `Acknowledgement for ${event}` : event,
  payload: withExamples(
    walkSchema(schema, {
      ctx: { direction },
      onMissing,
      onEach,
      rules: depicters,
    }),
    examples,
  ),
  examples:
    examples && examples.length
      ? examples.map((example) => ({ payload: example }))
      : undefined,
});

export const depictOperation = ({
  direction,
  channelId,
  messageId,
  ackId,
  event,
  ns,
  securityIds,
}: {
  channelId: string;
  messageId: string;
  ackId?: string;
  event: string;
  ns: string;
  securityIds?: string[];
} & AsyncAPIContext): OperationObject => ({
  action: direction === "out" ? "send" : "receive",
  channel: { $ref: `#/channels/${channelId}` },
  messages: [{ $ref: `#/channels/${channelId}/messages/${messageId}` }],
  title: event,
  summary: `${direction === "out" ? "Outgoing" : "Incoming"} event ${event}`,
  description:
    `The message ${direction === "out" ? "produced" : "consumed"} by ` +
    `the application within the ${ns} namespace`,
  security:
    securityIds && securityIds.length
      ? securityIds.map((id) => ({
          $ref: `#/components/securitySchemes/${id}`,
        }))
      : undefined,
  reply: ackId
    ? {
        address: {
          location: "$message.payload#",
          description: "Last argument: acknowledgement handler",
        },
        channel: { $ref: `#/channels/${channelId}` },
        messages: [{ $ref: `#/channels/${channelId}/messages/${ackId}` }],
      }
    : undefined,
});
