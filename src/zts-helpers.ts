import ts from "typescript";
import { FlatObject } from "./common-helpers";
import { SchemaHandler } from "./schema-walker";

const { factory: f } = ts;

export interface ZTSContext extends FlatObject {
  isResponse: boolean;
  makeAlias: (key: object, produce: () => ts.TypeNode) => ts.TypeNode;
}

export type Producer = SchemaHandler<ts.TypeNode, ZTSContext>;

// @todo move everything below to typescript-api.ts
export const addJsDocComment = (node: ts.Node, text: string) => {
  ts.addSyntheticLeadingComment(
    node,
    ts.SyntaxKind.MultiLineCommentTrivia,
    `* ${text} `,
    true,
  );
};

export const createTypeAlias = (
  node: ts.TypeNode,
  name: string,
  comment?: string,
) => {
  const typeAlias = f.createTypeAliasDeclaration(
    undefined,
    f.createIdentifier(name),
    undefined,
    node,
  );
  if (comment) addJsDocComment(typeAlias, comment);
  return typeAlias;
};

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
