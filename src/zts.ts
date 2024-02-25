import ts from "typescript";
import { z } from "zod";

import {
  hasCoercion,
  lcFirst,
  makeCleanId,
  tryToTransform,
} from "./integration-helpers";
import { HandlingRules, walkSchema } from "./schema-walker";
import {
  LiteralType,
  Producer,
  ZTSContext,
  addJsDocComment,
  makePropertyIdentifier,
} from "./zts-helpers";

const { factory: f } = ts;

const samples = {
  [ts.SyntaxKind.AnyKeyword]: "",
  [ts.SyntaxKind.BigIntKeyword]: BigInt(0),
  [ts.SyntaxKind.BooleanKeyword]: false,
  [ts.SyntaxKind.NumberKeyword]: 0,
  [ts.SyntaxKind.ObjectKeyword]: {},
  [ts.SyntaxKind.StringKeyword]: "",
  [ts.SyntaxKind.UndefinedKeyword]: undefined,
  [ts.SyntaxKind.UnknownKeyword]: undefined,
} satisfies Partial<Record<ts.KeywordTypeSyntaxKind, unknown>>;

const onLiteral: Producer<z.ZodLiteral<LiteralType>> = ({
  schema: { value },
}) =>
  f.createLiteralTypeNode(
    typeof value === "number"
      ? f.createNumericLiteral(value)
      : typeof value === "boolean"
        ? value
          ? f.createTrue()
          : f.createFalse()
        : f.createStringLiteral(value),
  );

const onObject: Producer<z.ZodObject<z.ZodRawShape>> = ({
  schema: { shape },
  direction,
  next,
  optionalPropStyle: { withQuestionMark: hasQuestionMark },
}) => {
  const members = Object.entries(shape).map<ts.TypeElement>(([key, value]) => {
    const isOptional =
      direction === "out" && hasCoercion(value)
        ? value instanceof z.ZodOptional
        : value.isOptional();
    const propertySignature = f.createPropertySignature(
      undefined,
      makePropertyIdentifier(key),
      isOptional && hasQuestionMark
        ? f.createToken(ts.SyntaxKind.QuestionToken)
        : undefined,
      next(value),
    );
    if (value.description) {
      addJsDocComment(propertySignature, value.description);
    }
    return propertySignature;
  });
  return f.createTypeLiteralNode(members);
};

const onArray: Producer<z.ZodArray<z.ZodTypeAny>> = ({
  schema: { element },
  next,
}) => f.createArrayTypeNode(next(element));

const onEnum: Producer<z.ZodEnum<[string, ...string[]]>> = ({
  schema: { options },
}) =>
  f.createUnionTypeNode(
    options.map((option) =>
      f.createLiteralTypeNode(f.createStringLiteral(option)),
    ),
  );

const onSomeUnion: Producer<
  | z.ZodUnion<z.ZodUnionOptions>
  | z.ZodDiscriminatedUnion<string, z.ZodDiscriminatedUnionOption<string>[]>
> = ({ schema: { options }, next }) => f.createUnionTypeNode(options.map(next));

const makeSample = (produced: ts.TypeNode, src: z.ZodTypeAny) =>
  src instanceof z.ZodDate
    ? new Date()
    : samples?.[produced.kind as keyof typeof samples];

const onEffects: Producer<z.ZodEffects<z.ZodTypeAny>> = ({
  schema,
  next,
  direction,
}) => {
  const src = schema.innerType();
  const input = next(src);
  const effect = schema._def.effect;
  if (direction === "out" && effect.type === "transform") {
    const outputType = tryToTransform(schema, makeSample(input, src));
    const resolutions: Partial<
      Record<NonNullable<typeof outputType>, ts.KeywordTypeSyntaxKind>
    > = {
      number: ts.SyntaxKind.NumberKeyword,
      bigint: ts.SyntaxKind.BigIntKeyword,
      boolean: ts.SyntaxKind.BooleanKeyword,
      string: ts.SyntaxKind.StringKeyword,
      undefined: ts.SyntaxKind.UndefinedKeyword,
      object: ts.SyntaxKind.ObjectKeyword,
    };
    return f.createKeywordTypeNode(
      (outputType && resolutions[outputType]) || ts.SyntaxKind.AnyKeyword,
    );
  }
  return input;
};

const onNativeEnum: Producer<z.ZodNativeEnum<z.EnumLike>> = ({ schema }) =>
  f.createUnionTypeNode(
    Object.values(schema.enum).map((value) =>
      f.createLiteralTypeNode(
        typeof value === "number"
          ? f.createNumericLiteral(value)
          : f.createStringLiteral(value),
      ),
    ),
  );

const onOptional: Producer<z.ZodOptional<z.ZodTypeAny>> = ({
  next,
  schema,
  optionalPropStyle: { withUndefined: hasUndefined },
}) => {
  const actualTypeNode = next(schema.unwrap());
  return hasUndefined
    ? f.createUnionTypeNode([
        actualTypeNode,
        f.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
      ])
    : actualTypeNode;
};

const onNullable: Producer<z.ZodNullable<z.ZodTypeAny>> = ({ next, schema }) =>
  f.createUnionTypeNode([
    next(schema.unwrap()),
    f.createLiteralTypeNode(f.createNull()),
  ]);

const onTuple: Producer<z.ZodTuple> = ({ next, schema: { items } }) =>
  f.createTupleTypeNode(items.map(next));

const onRecord: Producer<z.ZodRecord> = ({
  next,
  schema: { keySchema, valueSchema },
}) =>
  f.createExpressionWithTypeArguments(
    f.createIdentifier("Record"),
    [keySchema, valueSchema].map(next),
  );

const onIntersection: Producer<
  z.ZodIntersection<z.ZodTypeAny, z.ZodTypeAny>
> = ({ next, schema }) =>
  f.createIntersectionTypeNode([schema._def.left, schema._def.right].map(next));

const onDefault: Producer<z.ZodDefault<z.ZodTypeAny>> = ({ next, schema }) =>
  next(schema._def.innerType);

const onPrimitive =
  (syntaxKind: ts.KeywordTypeSyntaxKind): Producer<z.ZodTypeAny> =>
  () =>
    f.createKeywordTypeNode(syntaxKind);

const onBranded: Producer<
  z.ZodBranded<z.ZodTypeAny, string | number | symbol>
> = ({ next, schema }) => next(schema.unwrap());

const onReadonly: Producer<z.ZodReadonly<z.ZodTypeAny>> = ({ next, schema }) =>
  next(schema._def.innerType);

const onCatch: Producer<z.ZodCatch<z.ZodTypeAny>> = ({ next, schema }) =>
  next(schema._def.innerType);

const onPipeline: Producer<z.ZodPipeline<z.ZodTypeAny, z.ZodTypeAny>> = ({
  schema,
  next,
  direction,
}) => next(schema._def[direction]);

const onNull: Producer<z.ZodNull> = () =>
  f.createLiteralTypeNode(f.createNull());

const onDate: Producer<z.ZodDate> = () =>
  f.createTypeReferenceNode(f.createIdentifier("Date"));

const onLazy: Producer<z.ZodLazy<z.ZodTypeAny>> = ({
  getAlias,
  makeAlias,
  next,
  serializer: serialize,
  schema: lazy,
}) => {
  const name = `Type${serialize(lazy.schema)}`;
  return (
    getAlias(name) ||
    (() => {
      makeAlias(name, f.createLiteralTypeNode(f.createNull())); // make empty type first
      return makeAlias(name, next(lazy.schema)); // update
    })()
  );
};

const onFunction: Producer<z.ZodFunction<z.AnyZodTuple, z.ZodTypeAny>> = ({
  schema,
  next,
}) => {
  const params = schema
    .parameters()
    .items.map((subject, index) =>
      f.createParameterDeclaration(
        undefined,
        undefined,
        f.createIdentifier(
          subject.description
            ? lcFirst(makeCleanId(subject.description))
            : `${subject instanceof z.ZodFunction ? "cb" : "p"}${index + 1}`,
        ),
        undefined,
        next(subject),
      ),
    );
  const { rest } = schema.parameters()._def;
  if (rest) {
    params.push(
      f.createParameterDeclaration(
        undefined,
        f.createToken(ts.SyntaxKind.DotDotDotToken),
        f.createIdentifier(
          rest.description ? lcFirst(makeCleanId(rest.description)) : "rest",
        ),
        undefined,
        next(z.array(rest)),
      ),
    );
  }
  return f.createFunctionTypeNode(undefined, params, next(schema.returnType()));
};

const producers: HandlingRules<ts.TypeNode, ZTSContext> = {
  ZodString: onPrimitive(ts.SyntaxKind.StringKeyword),
  ZodNumber: onPrimitive(ts.SyntaxKind.NumberKeyword),
  ZodBigInt: onPrimitive(ts.SyntaxKind.BigIntKeyword),
  ZodBoolean: onPrimitive(ts.SyntaxKind.BooleanKeyword),
  ZodAny: onPrimitive(ts.SyntaxKind.AnyKeyword),
  ZodVoid: onPrimitive(ts.SyntaxKind.VoidKeyword),
  ZodUnknown: onPrimitive(ts.SyntaxKind.UnknownKeyword),
  ZodDate: onDate,
  ZodNull: onNull,
  ZodArray: onArray,
  ZodTuple: onTuple,
  ZodRecord: onRecord,
  ZodObject: onObject,
  ZodLiteral: onLiteral,
  ZodIntersection: onIntersection,
  ZodUnion: onSomeUnion,
  ZodDefault: onDefault,
  ZodEnum: onEnum,
  ZodNativeEnum: onNativeEnum,
  ZodEffects: onEffects,
  ZodOptional: onOptional,
  ZodNullable: onNullable,
  ZodDiscriminatedUnion: onSomeUnion,
  ZodBranded: onBranded,
  ZodCatch: onCatch,
  ZodPipeline: onPipeline,
  ZodLazy: onLazy,
  ZodReadonly: onReadonly,
  ZodFunction: onFunction,
};

export const zodToTs = ({
  schema,
  ...ctx
}: {
  schema: z.ZodTypeAny;
} & ZTSContext) =>
  walkSchema<ts.TypeNode, ZTSContext>({
    schema,
    rules: producers,
    onMissing: () => f.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
    ...ctx,
  });
