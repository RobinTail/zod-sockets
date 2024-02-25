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
  protected aliases: Record<string, ts.TypeAliasDeclaration> = {};
  protected registry: Record<
    string, // namespace
    Record<"emission" | "actions", { event: string; node: ts.TypeNode }[]>
  > = {};

  protected getAlias(name: string): ts.TypeReferenceNode | undefined {
    return name in this.aliases ? f.createTypeReferenceNode(name) : undefined;
  }

  protected makeAlias(name: string, type: ts.TypeNode): ts.TypeReferenceNode {
    this.aliases[name] = createTypeAlias(type, name);
    return this.getAlias(name)!;
  }

  constructor({
    config: { emission: namespaces },
    actions,
    serializer = defaultSerializer,
    optionalPropStyle = { withQuestionMark: true, withUndefined: true },
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
      this.registry[ns] = { emission: [], actions: [] };
      for (const [event, { schema, ack }] of Object.entries(emission)) {
        const node = zodToTs({
          schema: makeEventFnSchema(schema, ack, 3),
          isResponse: true,
          getAlias: this.getAlias.bind(this),
          makeAlias: this.makeAlias.bind(this),
          serializer,
          optionalPropStyle,
        });
        this.registry[ns].emission.push({ event, node });
      }
      for (const action of actions) {
        if (action.getNamespace() !== ns) {
          continue;
        }
        const event = action.getEvent();
        const input = action.getSchema("input");
        const output = action.getSchema("output");
        const node = zodToTs({
          schema: makeEventFnSchema(input, output, 3),
          isResponse: false,
          getAlias: this.getAlias.bind(this),
          makeAlias: this.makeAlias.bind(this),
          serializer,
          optionalPropStyle,
        });
        this.registry[ns].actions.push({ event, node });
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
          f.createModuleBlock([...interfaces, socketNode]),
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
