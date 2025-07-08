import * as R from "ramda";
import { globalRegistry, z } from "zod/v4";
import type {
  $ZodDate,
  $ZodDiscriminatedUnion,
  $ZodPipe,
  $ZodShape,
  $ZodTransform,
  $ZodTuple,
  $ZodType,
  $ZodUnion,
  JSONSchema,
} from "zod/v4/core";
import {
  MessageObject,
  OperationObject,
  ReferenceObject,
  SchemaObject,
  SchemaObjectType,
} from "./async-api/model";
import { isReferenceObject } from "./async-api/helpers";
import { getTransformedType, isObject, isSchema } from "./common-helpers";
import { FirstPartyKind } from "./schema-walker";

export interface AsyncAPIContext {
  isResponse: boolean;
  makeRef: (
    key: object | string,
    subject: SchemaObject | ReferenceObject,
    name?: string,
  ) => ReferenceObject;
}

export type Depicter = (
  zodCtx: { zodSchema: $ZodType; jsonSchema: JSONSchema.BaseSchema },
  apiCtx: AsyncAPIContext,
) => JSONSchema.BaseSchema | SchemaObject;

const samples = {
  integer: 0,
  number: 0,
  string: "",
  boolean: false,
  object: {},
  null: null,
  array: [],
} satisfies Record<SchemaObjectType, unknown>;

export const depictUnion: Depicter = ({ zodSchema, jsonSchema }) => {
  if (!isSchema<$ZodUnion | $ZodDiscriminatedUnion>(zodSchema, "union"))
    return jsonSchema;
  if (!("discriminator" in zodSchema._zod.def)) return jsonSchema;
  const propertyName: string = zodSchema._zod.def.discriminator;
  return {
    ...jsonSchema,
    discriminator: jsonSchema.discriminator ?? { propertyName },
  };
};

/** @since OAS 3.1 nullable replaced with type array having null */
export const depictNullable: Depicter = ({ jsonSchema }) => {
  if (!jsonSchema.anyOf) return jsonSchema;
  const original = jsonSchema.anyOf[0];
  return Object.assign(original, { type: makeNullableType(original.type) });
};

export const depictBigInt: Depicter = () => ({
  type: "string",
  format: "bigint",
  pattern: /^-?\d+$/.source,
});

export const depictTuple: Depicter = ({ zodSchema, jsonSchema }) => {
  if ((zodSchema as $ZodTuple)._zod.def.rest !== null) return jsonSchema;
  // does not appear to support items:false, so not:{} is a recommended alias
  return { ...jsonSchema, items: { not: {} } };
};

export const depictPipeline: Depicter = ({ zodSchema, jsonSchema }, ctx) => {
  const target = (zodSchema as $ZodPipe)._zod.def[
    ctx.isResponse ? "out" : "in"
  ];
  const opposite = (zodSchema as $ZodPipe)._zod.def[
    ctx.isResponse ? "in" : "out"
  ];
  if (!isSchema<$ZodTransform>(target, "transform")) return jsonSchema;
  const opposingDepiction = asAsyncAPI(depict(opposite, { ctx }));
  if (!isReferenceObject(opposingDepiction)) {
    if (!ctx.isResponse) {
      const { type: opposingType, ...rest } = opposingDepiction;
      return {
        ...rest,
        format: `${rest.format || opposingType} (preprocessed)`,
      };
    } else {
      const targetType = getTransformedType(
        target,
        isSchema<$ZodDate>(opposite, "date")
          ? new Date()
          : makeSample(opposingDepiction),
      );
      if (targetType && ["number", "string", "boolean"].includes(targetType)) {
        return {
          ...jsonSchema,
          type: targetType as "number" | "string" | "boolean",
        };
      }
    }
  }
  return jsonSchema;
};

const asAsyncAPI = (subject: JSONSchema.BaseSchema) =>
  subject as SchemaObject | ReferenceObject;

const makeSample = (depicted: SchemaObject) => {
  const firstType = (
    Array.isArray(depicted.type) ? depicted.type[0] : depicted.type
  ) as keyof typeof samples;
  return samples?.[firstType];
};

const makeNullableType = (
  current:
    | JSONSchema.BaseSchema["type"]
    | Array<NonNullable<JSONSchema.BaseSchema["type"]>>,
): typeof current => {
  if (current === ("null" satisfies SchemaObjectType)) return current;
  if (typeof current === "string")
    return [current, "null" satisfies SchemaObjectType];
  return (
    current && [...new Set(current).add("null" satisfies SchemaObjectType)]
  );
};

export const depictDate: Depicter = () => ({ format: "date" });

const depicters: Partial<Record<FirstPartyKind, Depicter>> = {
  nullable: depictNullable,
  union: depictUnion,
  bigint: depictBigInt,
  tuple: depictTuple,
  pipe: depictPipeline,
  date: depictDate,
};

/**
 * @todo simplify if fixed (unable to customize references):
 * @link https://github.com/colinhacks/zod/issues/4281
 * */
const fixReferences = (
  subject: JSONSchema.BaseSchema,
  defs: Record<string, JSONSchema.BaseSchema>,
  ctx: AsyncAPIContext,
) => {
  const stack: unknown[] = [subject, defs];
  while (stack.length) {
    const entry = stack.shift()!;
    if (R.is(Object, entry)) {
      if (isReferenceObject(entry) && !entry.$ref.startsWith("#/components")) {
        const actualName = entry.$ref.split("/").pop()!;
        const depiction = defs[actualName];
        if (depiction) {
          entry.$ref = ctx.makeRef(
            depiction.id || depiction, // avoiding serialization, because changing $ref
            asAsyncAPI(depiction),
          ).$ref;
        }
        continue;
      }
      stack.push(...R.values(entry));
    }
    if (R.is(Array, entry)) stack.push(...R.values(entry));
  }
  return subject;
};

const depict = (
  subject: $ZodType,
  {
    ctx,
    rules = depicters,
  }: { ctx: AsyncAPIContext; rules?: Record<string, Depicter> },
) => {
  const { $defs = {}, properties = {} } = z.toJSONSchema(
    z.object({ subject }), // avoiding "document root" references
    {
      unrepresentable: "any",
      io: ctx.isResponse ? "output" : "input",
      override: (zodCtx) => {
        const depicter = rules[zodCtx.zodSchema._zod.def.type];
        if (depicter) {
          const overrides = { ...depicter(zodCtx, ctx) };
          for (const key in zodCtx.jsonSchema) delete zodCtx.jsonSchema[key];
          Object.assign(zodCtx.jsonSchema, overrides);
        }
      },
    },
  ) as JSONSchema.ObjectSchema;
  return fixReferences(
    isObject(properties["subject"]) ? properties["subject"] : {},
    $defs,
    ctx,
  );
};

/**
 * @since zod 3.25.44
 * @link https://github.com/colinhacks/zod/pull/4586
 * */
export const getExamples = (subject: $ZodType): ReadonlyArray<unknown> => {
  const { examples, example } = globalRegistry.get(subject) || {};
  if (examples) {
    return Array.isArray(examples)
      ? examples
      : Object.values(examples).map(({ value }) => value);
  }
  if (example !== undefined) return [example];
  if (isSchema<$ZodTuple>(subject, "tuple")) {
    const pulled: unknown[] = [];
    for (const item of subject._zod.def.items) {
      const itemExamples = getExamples(item);
      if (itemExamples.length) pulled.push(itemExamples[0]);
    }
    if (pulled.length !== subject._zod.def.items.length) return [];
    if (subject._zod.def.rest) {
      const restExamples = getExamples(subject._zod.def.rest);
      if (restExamples.length) pulled.push(restExamples[0]);
    }
    if (pulled.length) return [pulled];
  }
  return [];
};

export const depictMessage = ({
  event,
  schema,
  isResponse,
  isAck,
  makeRef,
}: {
  event: string;
  schema: z.ZodTuple;
  isAck?: boolean;
} & AsyncAPIContext) => {
  const msg: MessageObject = {
    name: isAck ? undefined : event,
    title: isAck ? `Acknowledgement for ${event}` : event,
    payload: asAsyncAPI(depict(schema, { ctx: { isResponse, makeRef } })),
  };
  const examples = getExamples(schema).map((example) => ({ payload: example }));
  if (examples.length) msg.examples = examples;
  return msg;
};

export const depictOperation = ({
  isResponse,
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
} & Pick<AsyncAPIContext, "isResponse">): OperationObject => ({
  action: isResponse ? "send" : "receive",
  channel: { $ref: `#/channels/${channelId}` },
  messages: [{ $ref: `#/channels/${channelId}/messages/${messageId}` }],
  title: event,
  summary: `${isResponse ? "Outgoing" : "Incoming"} event ${event}`,
  description:
    `The message ${isResponse ? "produced" : "consumed"} by ` +
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

export const depictProtocolFeatures = (
  shape: $ZodShape,
  {
    extra,
    makeRef,
  }: { extra?: SchemaObject } & Pick<AsyncAPIContext, "makeRef">,
) =>
  Object.assign(
    asAsyncAPI(
      depict(z.object(shape), {
        ctx: { isResponse: false, makeRef },
      }),
    ),
    extra,
  );
