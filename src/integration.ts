import ts from "typescript";
import { z } from "zod";
import { AbstractAction } from "./action";
import { makeCleanId } from "./common-helpers";
import { Config } from "./config";
import { makeEventFnSchema } from "./integration-helpers";
import { Namespaces, normalizeNS } from "./namespace";
import { zodToTs } from "./zts";
import {
  addJsDoc,
  makeType,
  printNode,
  f,
  exportModifier,
} from "./typescript-api";

interface IntegrationProps {
  config: Config<Namespaces>;
  actions: AbstractAction[];
  /**
   * @desc When event has both .rest() and an acknowledgement, the "...rest" can not be placed in a middle.
   * @desc In this case, overloads are used to reflect variations on different number of the function arguments.
   * @default 3
   * @example ( (cb) => void ) | ( (rest1, cb) => void ) | ( (rest1, rest2, cb) => void )
   */
  maxOverloads?: number;
}

const fallbackNs = "root";
const registryScopes = ["emission", "actions"];

export class Integration {
  #program: ts.Node[] = [];
  #aliases: Record<
    string, // namespace
    Map<object, ts.TypeAliasDeclaration>
  > = {};
  #ids = {
    path: f.createIdentifier("path"),
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

  #makeAlias(
    ns: string,
    key: object,
    produce: () => ts.TypeNode,
  ): ts.TypeReferenceNode {
    let name = this.#aliases[ns].get(key)?.name?.text;
    if (!name) {
      name = `Type${this.#aliases[ns].size + 1}`;
      const temp = f.createLiteralTypeNode(f.createNull());
      this.#aliases[ns].set(key, makeType(name, temp));
      this.#aliases[ns].set(key, makeType(name, produce()));
    }
    return f.createTypeReferenceNode(name);
  }

  constructor({
    config: { namespaces },
    actions,
    maxOverloads = 3,
  }: IntegrationProps) {
    this.#program.push(
      f.createImportDeclaration(
        undefined,
        f.createImportClause(
          true,
          undefined,
          f.createNamedImports([
            f.createImportSpecifier(
              false,
              this.#ids.socket,
              this.#ids.socketBase,
            ),
          ]),
        ),
        this.#ids.ioClient,
      ),
    );

    for (const [ns, { emission }] of Object.entries(namespaces)) {
      this.#aliases[ns] = new Map<z.ZodTypeAny, ts.TypeAliasDeclaration>();
      this.registry[ns] = { emission: [], actions: [] };
      const commons = { makeAlias: this.#makeAlias.bind(this, ns) };
      for (const [event, { schema, ack }] of Object.entries(emission)) {
        const node = zodToTs(makeEventFnSchema(schema, ack, maxOverloads), {
          isResponse: true,
          ...commons,
        });
        this.registry[ns].emission.push({ event, node });
      }
      for (const action of actions) {
        if (action.namespace === ns) {
          const { event, inputSchema, outputSchema } = action;
          const node = zodToTs(
            makeEventFnSchema(inputSchema, outputSchema, maxOverloads),
            { isResponse: false, ...commons },
          );
          this.registry[ns].actions.push({ event, node });
        }
      }
    }

    for (const ns in this.registry) {
      const publicName = makeCleanId(ns) || makeCleanId(fallbackNs);

      const nsNameNode = f.createVariableStatement(
        exportModifier,
        f.createVariableDeclarationList(
          [
            f.createVariableDeclaration(
              this.#ids.path,
              undefined,
              undefined,
              f.createStringLiteral(normalizeNS(ns)),
            ),
          ],
          ts.NodeFlags.Const,
        ),
      );
      addJsDoc(
        nsNameNode,
        `@desc The actual path of the ${publicName} namespace`,
      );

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
        this.#ids.socket,
        undefined,
        f.createTypeReferenceNode(this.#ids.socketBase, [
          f.createTypeReferenceNode(this.#ids.emission),
          f.createTypeReferenceNode(this.#ids.actions),
        ]),
      );
      addJsDoc(
        socketNode,
        `@example const socket: ${publicName}.${this.#ids.socket.text} = io(${publicName}.${this.#ids.path.text})`,
      );
      this.#program.push(
        f.createModuleDeclaration(
          exportModifier,
          f.createIdentifier(publicName),
          f.createModuleBlock([
            nsNameNode,
            ...this.#aliases[ns].values(),
            ...interfaces,
            socketNode,
          ]),
          ts.NodeFlags.Namespace,
        ),
      );
    }
  }

  public print(printerOptions?: ts.PrinterOptions) {
    return this.#program
      .map((node) => printNode(node, printerOptions))
      .join("\n\n");
  }
}
