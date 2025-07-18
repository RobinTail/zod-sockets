import ts from "typescript";
import type {
  $ZodArray,
  $ZodCatch,
  $ZodDate,
  $ZodDefault,
  $ZodDiscriminatedUnion,
  $ZodEnum,
  $ZodIntersection,
  $ZodLazy,
  $ZodLiteral,
  $ZodNonOptional,
  $ZodNullable,
  $ZodObject,
  $ZodOptional,
  $ZodPipe,
  $ZodReadonly,
  $ZodRecord,
  $ZodTemplateLiteral,
  $ZodTransform,
  $ZodTuple,
  $ZodType,
  $ZodUnion,
} from "zod/v4/core";
import { globalRegistry, z } from "zod/v4";
import {
  lcFirst,
  makeCleanId,
  getTransformedType,
  isSchema,
} from "./common-helpers";
import { FunctionSchema, isFunctionSchema } from "./function-schema";
import { hasCycle } from "./integration-helpers";
import { FirstPartyKind, HandlingRules, walkSchema } from "./schema-walker";
import * as R from "ramda";
import { Producer, ZTSContext } from "./zts-helpers";
import {
  ensureTypeNode,
  makeInterfaceProp,
  makeLiteralType,
  makeUnion,
} from "./typescript-api";

const { factory: f } = ts;

const samples = {
  [ts.SyntaxKind.AnyKeyword]: "",
  [ts.SyntaxKind.BigIntKeyword]: BigInt(0),
  [ts.SyntaxKind.BooleanKeyword]: false,
  [ts.SyntaxKind.NumberKeyword]: 0,
  [ts.SyntaxKind.ObjectKeyword]: {},
  [ts.SyntaxKind.StringKeyword]: "",
  [ts.SyntaxKind.UndefinedKeyword]: undefined,
} satisfies Partial<Record<ts.KeywordTypeSyntaxKind, unknown>>;

const nodePath = {
  name: R.path([
    "name" satisfies keyof ts.TypeElement,
    "text" satisfies keyof Exclude<
      NonNullable<ts.TypeElement["name"]>,
      ts.ComputedPropertyName
    >,
  ]),
  type: R.path(["type" satisfies keyof ts.PropertySignature]),
  optional: R.path(["questionToken" satisfies keyof ts.TypeElement]),
};

const onLiteral: Producer = ({ _zod: { def } }: $ZodLiteral) => {
  const values = def.values.map((entry) =>
    entry === undefined
      ? ensureTypeNode(ts.SyntaxKind.UndefinedKeyword)
      : makeLiteralType(entry),
  );
  return values.length === 1 ? values[0] : makeUnion(values);
};

const onTemplateLiteral: Producer = (
  { _zod: { def } }: $ZodTemplateLiteral,
  { next },
) => {
  const parts = [...def.parts];
  const shiftText = () => {
    let text = "";
    while (parts.length) {
      const part = parts.shift();
      if (isSchema(part)) {
        parts.unshift(part);
        break;
      }
      text += part ?? ""; // Handle potential undefined values
    }
    return text;
  };
  const head = f.createTemplateHead(shiftText());
  const spans: ts.TemplateLiteralTypeSpan[] = [];
  while (parts.length) {
    const schema = next(parts.shift() as $ZodType);
    const text = shiftText();
    const textWrapper = parts.length
      ? f.createTemplateMiddle
      : f.createTemplateTail;
    spans.push(f.createTemplateLiteralTypeSpan(schema, textWrapper(text)));
  }
  if (!spans.length) return makeLiteralType(head.text);
  return f.createTemplateLiteralType(head, spans);
};

const onObject: Producer = (
  obj: $ZodObject,
  { isResponse, next, makeAlias },
) => {
  const produce = () => {
    const members = Object.entries(obj._zod.def.shape).map<ts.TypeElement>(
      ([key, value]) => {
        const { description: comment, deprecated: isDeprecated } =
          globalRegistry.get(value) || {};
        return makeInterfaceProp(key, next(value), {
          comment,
          isDeprecated,
          isOptional:
            (isResponse ? value._zod.optout : value._zod.optin) === "optional",
        });
      },
    );
    return f.createTypeLiteralNode(members);
  };
  return hasCycle(obj, { io: isResponse ? "output" : "input" })
    ? makeAlias(obj, produce)
    : produce();
};

const onArray: Producer = ({ _zod: { def } }: $ZodArray, { next }) =>
  f.createArrayTypeNode(next(def.element));

const onEnum: Producer = ({ _zod: { def } }: $ZodEnum) =>
  makeUnion(Object.values(def.entries).map(makeLiteralType));

const onSomeUnion: Producer = (
  { _zod: { def } }: $ZodUnion | $ZodDiscriminatedUnion,
  { next },
) => {
  return makeUnion(def.options.map(next));
};

const makeSample = (produced: ts.TypeNode) =>
  samples?.[produced.kind as keyof typeof samples];

const onNullable: Producer = ({ _zod: { def } }: $ZodNullable, { next }) =>
  makeUnion([next(def.innerType), makeLiteralType(null)]);

const onTuple: Producer = ({ _zod: { def } }: $ZodTuple, { next }) =>
  f.createTupleTypeNode(
    def.items
      .map(next)
      .concat(def.rest === null ? [] : f.createRestTypeNode(next(def.rest))),
  );

const onRecord: Producer = ({ _zod: { def } }: $ZodRecord, { next }) =>
  ensureTypeNode("Record", [def.keyType, def.valueType].map(next));

const intersect = R.tryCatch(
  (nodes: ts.TypeNode[]) => {
    if (!nodes.every(ts.isTypeLiteralNode)) throw new Error("Not objects");
    const members = R.chain(R.prop("members"), nodes);
    const uniqs = R.uniqWith((...props) => {
      if (!R.eqBy(nodePath.name, ...props)) return false;
      if (R.both(R.eqBy(nodePath.type), R.eqBy(nodePath.optional))(...props))
        return true;
      throw new Error("Has conflicting prop");
    }, members);
    return f.createTypeLiteralNode(uniqs);
  },
  (_err, nodes) => f.createIntersectionTypeNode(nodes),
);

const onIntersection: Producer = (
  { _zod: { def } }: $ZodIntersection,
  { next },
) => intersect([def.left, def.right].map(next));

const onPrimitive =
  (syntaxKind: ts.KeywordTypeSyntaxKind): Producer =>
  () =>
    ensureTypeNode(syntaxKind);

const onWrapped: Producer = (
  {
    _zod: { def },
  }: $ZodReadonly | $ZodCatch | $ZodDefault | $ZodOptional | $ZodNonOptional,
  { next },
) => next(def.innerType);

const getFallback = (isResponse: boolean) =>
  ensureTypeNode(
    isResponse ? ts.SyntaxKind.UnknownKeyword : ts.SyntaxKind.AnyKeyword,
  );

const onPipeline: Producer = (
  { _zod: { def } }: $ZodPipe,
  { next, isResponse },
) => {
  const target = def[isResponse ? "out" : "in"];
  const opposite = def[isResponse ? "in" : "out"];
  if (!isSchema<$ZodTransform>(target, "transform")) return next(target);
  const opposingType = next(opposite);
  const targetType = getTransformedType(
    target,
    isSchema<$ZodDate>(opposite, "date")
      ? new Date()
      : makeSample(opposingType),
  );
  const resolutions: Partial<
    Record<NonNullable<typeof targetType>, ts.KeywordTypeSyntaxKind>
  > = {
    number: ts.SyntaxKind.NumberKeyword,
    bigint: ts.SyntaxKind.BigIntKeyword,
    boolean: ts.SyntaxKind.BooleanKeyword,
    string: ts.SyntaxKind.StringKeyword,
    undefined: ts.SyntaxKind.UndefinedKeyword,
    object: ts.SyntaxKind.ObjectKeyword,
  };
  return ensureTypeNode(
    (targetType && resolutions[targetType]) || getFallback(isResponse),
  );
};

const onNull: Producer = () => makeLiteralType(null);

const onLazy: Producer = ({ _zod: { def } }: $ZodLazy, { makeAlias, next }) =>
  makeAlias(def.getter, () => next(def.getter()));

const onDate: Producer = () => ensureTypeNode("Date");

const onFunction: Producer = (schema: FunctionSchema, { next }) => {
  const params = schema._zod.bag.input._zod.def.items.map((subject, index) => {
    const { description } = globalRegistry.get(subject) || {};
    return f.createParameterDeclaration(
      undefined,
      undefined,
      f.createIdentifier(
        description
          ? lcFirst(makeCleanId(description))
          : `${isFunctionSchema(subject) ? "cb" : "p"}${index + 1}`,
      ),
      undefined,
      next(subject),
    );
  });
  const { rest } = schema._zod.bag.input._zod.def;
  if (rest) {
    const { description } = globalRegistry.get(rest) || {};
    params.push(
      f.createParameterDeclaration(
        undefined,
        f.createToken(ts.SyntaxKind.DotDotDotToken),
        f.createIdentifier(
          description ? lcFirst(makeCleanId(description)) : "rest",
        ),
        undefined,
        next(z.array(rest)),
      ),
    );
  }
  return f.createFunctionTypeNode(
    undefined,
    params,
    next(schema._zod.bag.output),
  );
};

const producers: HandlingRules<
  ts.TypeNode,
  ZTSContext,
  FirstPartyKind | "function"
> = {
  string: onPrimitive(ts.SyntaxKind.StringKeyword),
  number: onPrimitive(ts.SyntaxKind.NumberKeyword),
  bigint: onPrimitive(ts.SyntaxKind.BigIntKeyword),
  boolean: onPrimitive(ts.SyntaxKind.BooleanKeyword),
  any: onPrimitive(ts.SyntaxKind.AnyKeyword),
  undefined: onPrimitive(ts.SyntaxKind.UndefinedKeyword),
  never: onPrimitive(ts.SyntaxKind.NeverKeyword),
  void: onPrimitive(ts.SyntaxKind.VoidKeyword),
  unknown: onPrimitive(ts.SyntaxKind.UnknownKeyword),
  date: onDate,
  null: onNull,
  array: onArray,
  tuple: onTuple,
  record: onRecord,
  object: onObject,
  literal: onLiteral,
  template_literal: onTemplateLiteral,
  intersection: onIntersection,
  union: onSomeUnion,
  default: onWrapped,
  enum: onEnum,
  optional: onWrapped,
  nonoptional: onWrapped,
  nullable: onNullable,
  catch: onWrapped,
  pipe: onPipeline,
  lazy: onLazy,
  readonly: onWrapped,
  function: onFunction,
};

export const zodToTs = (schema: z.ZodType, ctx: ZTSContext) =>
  walkSchema(schema, {
    rules: producers,
    onMissing: ({}, { isResponse }) => getFallback(isResponse),
    ctx,
  });
