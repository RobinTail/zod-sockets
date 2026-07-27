import * as R from "ramda";
import ts from "typescript"; // eslint-disable-line allowed/dependencies -- opt-in export

export const f = ts.factory;
export { ts };

export type Typeable =
  ts.TypeNode | ts.Identifier | string | ts.KeywordTypeSyntaxKind;

type TypeParams =
  | string[]
  | Partial<Record<string, Typeable | { type?: ts.TypeNode; init: Typeable }>>;

export class TypescriptAPI {
  public exportModifier: ts.ModifierToken<ts.SyntaxKind.ExportKeyword>[];
  #primitives: ts.KeywordTypeSyntaxKind[];
  static #safePropRegex = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

  constructor() {
    this.exportModifier = [f.createModifier(ts.SyntaxKind.ExportKeyword)];
    this.#primitives = [
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
  }

  public addJsDoc = <T extends ts.Node>(node: T, text: string) =>
    ts.addSyntheticLeadingComment(
      node,
      ts.SyntaxKind.MultiLineCommentTrivia,
      `* ${text} `,
      true,
    );

  public printNode = (node: ts.Node, printerOptions?: ts.PrinterOptions) => {
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

  public makeId = (name: string) => f.createIdentifier(name);

  public makePropertyIdentifier = (name: string | number) =>
    typeof name === "string" && TypescriptAPI.#safePropRegex.test(name)
      ? this.makeId(name)
      : this.literally(name);

  public ensureTypeNode = (
    subject: Typeable,
    args?: Typeable[], // only for string and id
  ): ts.TypeNode =>
    typeof subject === "number"
      ? f.createKeywordTypeNode(subject)
      : typeof subject === "string" || ts.isIdentifier(subject)
        ? f.createTypeReferenceNode(
            subject,
            args && R.map(this.ensureTypeNode, args),
          )
        : subject;

  /**
   * @internal
   * ensures distinct union (unique primitives)
   * */
  public makeUnion = (entries: ts.TypeNode[]) => {
    const nodes = new Map<
      ts.TypeNode | ts.KeywordTypeSyntaxKind,
      ts.TypeNode
    >();
    for (const entry of entries)
      nodes.set(this.isPrimitive(entry) ? entry.kind : entry, entry);
    return f.createUnionTypeNode(Array.from(nodes.values()));
  };

  public makeInterfaceProp = (
    name: string | number,
    value: Typeable,
    {
      isOptional,
      hasUndefined = isOptional,
      isDeprecated,
      comment,
    }: {
      isOptional?: boolean;
      hasUndefined?: boolean;
      isDeprecated?: boolean;
      comment?: string;
    } = {},
  ) => {
    const propType = this.ensureTypeNode(value);
    const node = f.createPropertySignature(
      undefined,
      this.makePropertyIdentifier(name),
      isOptional ? f.createToken(ts.SyntaxKind.QuestionToken) : undefined,
      hasUndefined
        ? this.makeUnion([
            propType,
            this.ensureTypeNode(ts.SyntaxKind.UndefinedKeyword),
          ])
        : propType,
    );
    const jsdoc = R.reject(R.isNil, [
      isDeprecated ? "@deprecated" : undefined,
      comment,
    ]);
    return jsdoc.length ? this.addJsDoc(node, jsdoc.join(" ")) : node;
  };

  public makeConst = (
    name: string | ts.Identifier | ts.ArrayBindingPattern,
    value: ts.Expression,
    { type, expose }: { type?: Typeable; expose?: true } = {},
  ) =>
    f.createVariableStatement(
      expose && this.exportModifier,
      f.createVariableDeclarationList(
        [
          f.createVariableDeclaration(
            name,
            undefined,
            type ? this.ensureTypeNode(type) : undefined,
            value,
          ),
        ],
        ts.NodeFlags.Const,
      ),
    );

  public makeType = (
    name: ts.Identifier | string,
    value: ts.TypeNode,
    {
      expose,
      comment,
      params,
    }: { expose?: boolean; comment?: string; params?: TypeParams } = {},
  ) => {
    const node = f.createTypeAliasDeclaration(
      expose ? this.exportModifier : undefined,
      name,
      params && this.makeTypeParams(params),
      value,
    );
    return comment ? this.addJsDoc(node, comment) : node;
  };

  public makeInterface = (
    name: ts.Identifier | string,
    props: ts.PropertySignature[],
    { expose, comment }: { expose?: boolean; comment?: string } = {},
  ) => {
    const node = f.createInterfaceDeclaration(
      expose ? this.exportModifier : undefined,
      name,
      undefined,
      undefined,
      props,
    );
    return comment ? this.addJsDoc(node, comment) : node;
  };

  public makeTypeParams = (
    params:
      | string[]
      | Partial<
          Record<string, Typeable | { type?: ts.TypeNode; init: Typeable }>
        >,
  ) =>
    (Array.isArray(params)
      ? params.map((name) => R.pair(name, undefined))
      : Object.entries(params)
    ).map(([name, val]) => {
      const { type, init } =
        typeof val === "object" && "init" in val ? val : { type: val };
      return f.createTypeParameterDeclaration(
        [],
        name,
        type ? this.ensureTypeNode(type) : undefined,
        init ? this.ensureTypeNode(init) : undefined,
      );
    });

  /* eslint-disable prettier/prettier -- shorter and works better this way than overrides */
  public literally = <T extends string | null | boolean | number | bigint>(subj: T) => (
      typeof subj === "number" ? f.createNumericLiteral(subj)
          : typeof subj === "bigint" ? f.createBigIntLiteral(subj.toString())
              : typeof subj === "boolean" ? subj ? f.createTrue() : f.createFalse()
                  : subj === null ? f.createNull() : f.createStringLiteral(subj)
  ) as T extends string ? ts.StringLiteral : T extends number ? ts.NumericLiteral
      : T extends boolean ? ts.BooleanLiteral : ts.NullLiteral;
  /* eslint-enable prettier/prettier */

  public makeLiteralType = (subj: Parameters<typeof this.literally>[0]) =>
    f.createLiteralTypeNode(this.literally(subj));

  public isPrimitive = (node: ts.TypeNode): node is ts.KeywordTypeNode =>
    (this.#primitives as ts.SyntaxKind[]).includes(node.kind);
}
