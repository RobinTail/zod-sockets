import * as R from "ramda";
import type ts from "typescript";

export type Typeable =
  | ts.TypeNode
  | ts.Identifier
  | string
  | ts.KeywordTypeSyntaxKind;

type TypeParams =
  | string[]
  | Partial<Record<string, Typeable | { type?: ts.TypeNode; init: Typeable }>>;

export class TypescriptAPI {
  public ts: typeof ts;
  public f: typeof ts.factory;
  public exportModifier: ts.ModifierToken<ts.SyntaxKind.ExportKeyword>[];
  public accessModifiers: Record<
    "public" | "publicStatic" | "protectedReadonly",
    ts.Modifier[]
  >;
  #primitives: ts.KeywordTypeSyntaxKind[];
  static #safePropRegex = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

  constructor(typescript: typeof ts) {
    this.ts = typescript;
    this.f = this.ts.factory;
    this.exportModifier = [
      this.f.createModifier(this.ts.SyntaxKind.ExportKeyword),
    ];
    this.accessModifiers = {
      public: [this.f.createModifier(this.ts.SyntaxKind.PublicKeyword)],
      publicStatic: [
        this.f.createModifier(this.ts.SyntaxKind.PublicKeyword),
        this.f.createModifier(this.ts.SyntaxKind.StaticKeyword),
      ],
      protectedReadonly: [
        this.f.createModifier(this.ts.SyntaxKind.ProtectedKeyword),
        this.f.createModifier(this.ts.SyntaxKind.ReadonlyKeyword),
      ],
    };
    this.#primitives = [
      this.ts.SyntaxKind.AnyKeyword,
      this.ts.SyntaxKind.BigIntKeyword,
      this.ts.SyntaxKind.BooleanKeyword,
      this.ts.SyntaxKind.NeverKeyword,
      this.ts.SyntaxKind.NumberKeyword,
      this.ts.SyntaxKind.ObjectKeyword,
      this.ts.SyntaxKind.StringKeyword,
      this.ts.SyntaxKind.SymbolKeyword,
      this.ts.SyntaxKind.UndefinedKeyword,
      this.ts.SyntaxKind.UnknownKeyword,
      this.ts.SyntaxKind.VoidKeyword,
    ];
  }

  public addJsDoc = <T extends ts.Node>(node: T, text: string) =>
    this.ts.addSyntheticLeadingComment(
      node,
      this.ts.SyntaxKind.MultiLineCommentTrivia,
      `* ${text} `,
      true,
    );

  public printNode = (node: ts.Node, printerOptions?: ts.PrinterOptions) => {
    const sourceFile = this.ts.createSourceFile(
      "print.ts",
      "",
      this.ts.ScriptTarget.Latest,
      false,
      this.ts.ScriptKind.TS,
    );
    const printer = this.ts.createPrinter(printerOptions);
    return printer.printNode(this.ts.EmitHint.Unspecified, node, sourceFile);
  };

  public makeId = (name: string) => this.f.createIdentifier(name);

  public makePropertyIdentifier = (name: string | number) =>
    typeof name === "string" && TypescriptAPI.#safePropRegex.test(name)
      ? this.makeId(name)
      : this.literally(name);

  public ensureTypeNode = (
    subject: Typeable,
    args?: Typeable[], // only for string and id
  ): ts.TypeNode =>
    typeof subject === "number"
      ? this.f.createKeywordTypeNode(subject)
      : typeof subject === "string" || this.ts.isIdentifier(subject)
        ? this.f.createTypeReferenceNode(
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
    return this.f.createUnionTypeNode(Array.from(nodes.values()));
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
    const node = this.f.createPropertySignature(
      undefined,
      this.makePropertyIdentifier(name),
      isOptional
        ? this.f.createToken(this.ts.SyntaxKind.QuestionToken)
        : undefined,
      hasUndefined
        ? this.makeUnion([
            propType,
            this.ensureTypeNode(this.ts.SyntaxKind.UndefinedKeyword),
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
    this.f.createVariableStatement(
      expose && this.exportModifier,
      this.f.createVariableDeclarationList(
        [
          this.f.createVariableDeclaration(
            name,
            undefined,
            type ? this.ensureTypeNode(type) : undefined,
            value,
          ),
        ],
        this.ts.NodeFlags.Const,
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
    const node = this.f.createTypeAliasDeclaration(
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
    const node = this.f.createInterfaceDeclaration(
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
      return this.f.createTypeParameterDeclaration(
        [],
        name,
        type ? this.ensureTypeNode(type) : undefined,
        init ? this.ensureTypeNode(init) : undefined,
      );
    });

  /* eslint-disable prettier/prettier -- shorter and works better this way than overrides */
  public literally = <T extends string | null | boolean | number | bigint>(subj: T) => (
      typeof subj === "number" ? this.f.createNumericLiteral(subj)
          : typeof subj === "bigint" ? this.f.createBigIntLiteral(subj.toString())
              : typeof subj === "boolean" ? subj ? this.f.createTrue() : this.f.createFalse()
                  : subj === null ? this.f.createNull() : this.f.createStringLiteral(subj)
  ) as T extends string ? ts.StringLiteral : T extends number ? ts.NumericLiteral
      : T extends boolean ? ts.BooleanLiteral : ts.NullLiteral;
  /* eslint-enable prettier/prettier */

  public makeLiteralType = (subj: Parameters<typeof this.literally>[0]) =>
    this.f.createLiteralTypeNode(this.literally(subj));

  public isPrimitive = (node: ts.TypeNode): node is ts.KeywordTypeNode =>
    (this.#primitives as ts.SyntaxKind[]).includes(node.kind);
}
