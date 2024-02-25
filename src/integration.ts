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
   * @example ( (cb) => void ) | ( (rest1, cb) => void ) | ( (rest1, rest2, cb) => void )
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

const fallbackNs = "root";
const registryScopes = ["emission", "actions"];

export class Integration {
  protected program: ts.Node[] = [];
  protected aliases: Record<
    string, // namespace
    Record<string, ts.TypeAliasDeclaration>
  > = {};
  protected ids = {
    socket: f.createIdentifier("Socket"),
    socketBase: f.createIdentifier("SocketBase"),
    ioClient: f.createStringLiteral("socket.io-client"),
    emission: f.createIdentifier(makeCleanId(registryScopes[0])),
    actions: f.createIdentifier(makeCleanId(registryScopes[1])),
  };
  protected registry: Record<
    string, // namespace
    Record<
      (typeof registryScopes)[number],
      { event: string; node: ts.TypeNode }[]
    >
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
              this.ids.socket,
              this.ids.socketBase,
            ),
          ]),
        ),
        this.ids.ioClient,
      ),
    );

    for (const [ns, emission] of Object.entries(namespaces)) {
      this.aliases[ns] = {};
      this.registry[ns] = { emission: [], actions: [] };
      const commons = {
        getAlias: this.getAlias.bind(this, ns),
        makeAlias: this.makeAlias.bind(this, ns),
        serializer,
        optionalPropStyle,
      };
      for (const [event, { schema, ack }] of Object.entries(emission)) {
        const node = zodToTs({
          schema: makeEventFnSchema(schema, ack, maxOverloads),
          direction: "out",
          ...commons,
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
            ...commons,
          });
          this.registry[ns].actions.push({ event, node });
        }
      }
    }

    for (const ns in this.registry) {
      const publicName = makeCleanId(ns) || makeCleanId(fallbackNs);
      const interfaces = Object.entries(this.registry[ns]).map(
        ([scope, events]) =>
          f.createInterfaceDeclaration(
            exportModifier,
            makeCleanId(scope),
            undefined,
            undefined,
            events.map(({ event, node }) =>
              f.createPropertySignature(undefined, event, undefined, node),
            ),
          ),
      );
      const socketNode = f.createTypeAliasDeclaration(
        exportModifier,
        this.ids.socket,
        undefined,
        f.createTypeReferenceNode(this.ids.socketBase, [
          f.createTypeReferenceNode(this.ids.emission),
          f.createTypeReferenceNode(this.ids.actions),
        ]),
      );
      addJsDocComment(
        socketNode,
        `@example const socket: ${publicName}.${this.ids.socket.text} = io("${ns}")`,
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
