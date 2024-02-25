import ts from "typescript";
import { z } from "zod";
import { AbstractAction } from "./action";
import { Config } from "./config";
import { EmissionMap } from "./emission";
import {
  defaultSerializer,
  exportModifier,
  f,
  makeCleanId,
  makeEventFnSchema,
} from "./integration-helpers";
import { Namespaces } from "./namespaces";
import { zodToTs } from "./zts";
import { addJsDocComment, createTypeAlias, printNode } from "./zts-helpers";

interface IntegrationProps {
  config: Config<Namespaces<EmissionMap>>;
  actions: AbstractAction[];
  /**
   * @desc When event has both .rest() and an acknowledgement, the "...rest" can not be placed in a middle.
   * @desc In this case, overloads are used to reflect variations on different number of the function arguments.
   * @default 3
   * @example (cb) => void | (rest1, cb) => void | (rest1, rest2, cb) => void | (rest1, rest2, rest3, cb) => void
   * @todo reconsider naming
   */
  maxOverloads?: number;
  /**
   * @desc Used for comparing schemas wrapped into z.lazy() to limit the recursion
   * @default JSON.stringify() + SHA1 hash as a hex digest
   * */
  serializer?: (schema: z.ZodTypeAny) => string;
  /**
   * @desc configures the style of object's optional properties
   * @default { withQuestionMark: true, withUndefined: true }
   */
  optionalPropStyle?: {
    /**
     * @desc add question mark to the optional property definition
     * @example { someProp?: boolean }
     * */
    withQuestionMark?: boolean;
    /**
     * @desc add undefined to the property union type
     * @example { someProp: boolean | undefined }
     */
    withUndefined?: boolean;
  };
}

export class Integration {
  protected program: ts.Node[] = [];
  protected aliases: Record<
    string, // namespace
    Record<string, ts.TypeAliasDeclaration>
  > = {};
  protected registry: Record<
    string, // namespace
    Record<"emission" | "actions", { event: string; node: ts.TypeNode }[]>
  > = {};

  protected getAlias(
    ns: string,
    name: string,
  ): ts.TypeReferenceNode | undefined {
    return name in this.aliases[ns]
      ? f.createTypeReferenceNode(name)
      : undefined;
  }

  protected makeAlias(
    ns: string,
    name: string,
    type: ts.TypeNode,
  ): ts.TypeReferenceNode {
    this.aliases[ns][name] = createTypeAlias(type, name);
    return this.getAlias(ns, name)!;
  }

  constructor({
    config: { emission: namespaces },
    actions,
    serializer = defaultSerializer,
    optionalPropStyle = { withQuestionMark: true, withUndefined: true },
    maxOverloads = 3,
  }: IntegrationProps) {
    this.program.push(
      f.createImportDeclaration(
        undefined,
        f.createImportClause(
          true,
          undefined,
          f.createNamedImports([
            f.createImportSpecifier(
              false,
              f.createIdentifier("Socket"),
              f.createIdentifier("SocketBase"),
            ),
          ]),
        ),
        f.createStringLiteral("socket.io-client"),
        undefined,
      ),
    );

    for (const [ns, emission] of Object.entries(namespaces)) {
      this.aliases[ns] = {};
      this.registry[ns] = { emission: [], actions: [] };
      for (const [event, { schema, ack }] of Object.entries(emission)) {
        const node = zodToTs({
          schema: makeEventFnSchema(schema, ack, maxOverloads),
          direction: "out",
          getAlias: this.getAlias.bind(this, ns),
          makeAlias: this.makeAlias.bind(this, ns),
          serializer,
          optionalPropStyle,
        });
        this.registry[ns].emission.push({ event, node });
      }
      for (const action of actions) {
        if (action.getNamespace() === ns) {
          const event = action.getEvent();
          const input = action.getSchema("input");
          const output = action.getSchema("output");
          const node = zodToTs({
            schema: makeEventFnSchema(input, output, maxOverloads),
            direction: "in",
            getAlias: this.getAlias.bind(this, ns),
            makeAlias: this.makeAlias.bind(this, ns),
            serializer,
            optionalPropStyle,
          });
          this.registry[ns].actions.push({ event, node });
        }
      }
    }

    for (const ns in this.registry) {
      const publicName = makeCleanId(ns) || makeCleanId("root");
      const interfaces = Object.entries(this.registry[ns]).map(
        ([direction, events]) =>
          f.createInterfaceDeclaration(
            exportModifier,
            makeCleanId(direction),
            undefined,
            undefined,
            events.map(({ event, node }) =>
              f.createPropertySignature(undefined, event, undefined, node),
            ),
          ),
      );
      const socketNode = f.createTypeAliasDeclaration(
        exportModifier,
        f.createIdentifier("Socket"),
        undefined,
        f.createTypeReferenceNode(f.createIdentifier("SocketBase"), [
          f.createTypeReferenceNode(f.createIdentifier("Emission")),
          f.createTypeReferenceNode(f.createIdentifier("Actions")),
        ]),
      );
      addJsDocComment(
        socketNode,
        `@example const socket: ${publicName}.Socket = io("${ns}")`,
      );
      this.program.push(
        f.createModuleDeclaration(
          exportModifier,
          f.createIdentifier(publicName),
          f.createModuleBlock([
            ...Object.values(this.aliases[ns]),
            ...interfaces,
            socketNode,
          ]),
          ts.NodeFlags.Namespace,
        ),
      );
    }
  }

  public print(printerOptions?: ts.PrinterOptions) {
    return this.program
      .map((node, index) =>
        printNode(
          node,
          index < this.program.length
            ? printerOptions
            : { ...printerOptions, omitTrailingSemicolon: true },
        ),
      )
      .join("\n\n");
  }
}
