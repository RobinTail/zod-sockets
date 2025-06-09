import * as R from "ramda";
import ts from "typescript";

export type Typeable =
  | ts.TypeNode
  | ts.Identifier
  | string
  | ts.KeywordTypeSyntaxKind;

export const f = ts.factory;

export const exportModifier = [f.createModifier(ts.SyntaxKind.ExportKeyword)];

export const addJsDoc = <T extends ts.Node>(node: T, text: string) =>
  ts.addSyntheticLeadingComment(
    node,
    ts.SyntaxKind.MultiLineCommentTrivia,
    `* ${text} `,
    true,
  );

export const printNode = (
  node: ts.Node,
  printerOptions?: ts.PrinterOptions,
) => {
  const sourceFile = ts.createSourceFile(
    "print.ts",
    "",
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS,
  );
  const printer = ts.createPrinter(printerOptions);
  return printer.printNode(ts.EmitHint.Unspecified, node, sourceFile);
};

const safePropRegex = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
export const makePropertyIdentifier = (name: string | number) =>
  typeof name === "string" && safePropRegex.test(name)
    ? f.createIdentifier(name)
    : literally(name);

export const ensureTypeNode = (
  subject: Typeable,
  args?: Typeable[], // only for string and id
): ts.TypeNode =>
  typeof subject === "number"
    ? f.createKeywordTypeNode(subject)
    : typeof subject === "string" || ts.isIdentifier(subject)
      ? f.createTypeReferenceNode(subject, args && R.map(ensureTypeNode, args))
      : subject;

export const makeInterfaceProp = (
  name: string | number,
  value: Typeable,
  {
    isOptional,
    isDeprecated,
    comment,
  }: { isOptional?: boolean; isDeprecated?: boolean; comment?: string } = {},
) => {
  const propType = ensureTypeNode(value);
  const node = f.createPropertySignature(
    undefined,
    makePropertyIdentifier(name),
    isOptional ? f.createToken(ts.SyntaxKind.QuestionToken) : undefined,
    isOptional
      ? f.createUnionTypeNode([
          propType,
          ensureTypeNode(ts.SyntaxKind.UndefinedKeyword),
        ])
      : propType,
  );
  const jsdoc = R.reject(R.isNil, [
    isDeprecated ? "@deprecated" : undefined,
    comment,
  ]);
  return jsdoc.length ? addJsDoc(node, jsdoc.join(" ")) : node;
};

export const makeType = (
  name: ts.Identifier | string,
  value: ts.TypeNode,
  { expose, comment }: { expose?: boolean; comment?: string } = {},
) => {
  const node = f.createTypeAliasDeclaration(
    expose ? exportModifier : undefined,
    name,
    undefined,
    value,
  );
  return comment ? addJsDoc(node, comment) : node;
};

/* eslint-disable prettier/prettier -- shorter and works better this way than overrides */
export const literally = <T extends string | null | boolean | number | bigint>(subj: T) => (
  typeof subj === "number" ? f.createNumericLiteral(subj)
    : typeof subj === "bigint" ? f.createBigIntLiteral(subj.toString())
    : typeof subj === "boolean" ? subj ? f.createTrue() : f.createFalse()
    : subj === null ? f.createNull() : f.createStringLiteral(subj)
  ) as T extends string ? ts.StringLiteral : T extends number ? ts.NumericLiteral
    : T extends boolean ? ts.BooleanLiteral : ts.NullLiteral;
/* eslint-enable prettier/prettier */

export const makeLiteralType = (subj: Parameters<typeof literally>[0]) =>
  f.createLiteralTypeNode(literally(subj));

const primitives: ts.KeywordTypeSyntaxKind[] = [
  ts.SyntaxKind.AnyKeyword,
  ts.SyntaxKind.BigIntKeyword,
  ts.SyntaxKind.BooleanKeyword,
  ts.SyntaxKind.NeverKeyword,
  ts.SyntaxKind.NumberKeyword,
  ts.SyntaxKind.ObjectKeyword,
  ts.SyntaxKind.StringKeyword,
  ts.SyntaxKind.SymbolKeyword,
  ts.SyntaxKind.UndefinedKeyword,
  ts.SyntaxKind.UnknownKeyword,
  ts.SyntaxKind.VoidKeyword,
];
export const isPrimitive = (node: ts.TypeNode): node is ts.KeywordTypeNode =>
  (primitives as ts.SyntaxKind[]).includes(node.kind);
