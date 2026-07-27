import { z } from "zod";
import { AbstractAction } from "./action";
import { makeCleanId } from "./common-helpers";
import { Config } from "./config";
import { makeEventFnSchema } from "./integration-helpers";
import { type Namespaces, normalizeNS } from "./namespace";
import { zodToTs } from "./zts";
import { TypescriptAPI, ts, f } from "./typescript-api";

interface IntegrationParams {
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
  /** @internal */
  protected readonly api: TypescriptAPI;
  #program: ts.Node[] = [];
  #aliases: Record<
    string, // namespace
    Map<object, ts.TypeAliasDeclaration>
  > = {};
  #ids = {
    path: "path",
    socket: "Socket",
    socketBase: "SocketBase",
    ioClient: "socket.io-client",
    emission: makeCleanId(registryScopes[0]),
    actions: makeCleanId(registryScopes[1]),
  };
  protected registry: Record<
    string, // namespace
    Record<
      (typeof registryScopes)[number],
      { event: string; node: ts.TypeNode }[]
    >
  > = {};

  #makeAlias(ns: string, key: object, produce: () => ts.TypeNode): ts.TypeNode {
    let name = this.#aliases[ns].get(key)?.name?.text;
    if (!name) {
      name = `Type${this.#aliases[ns].size + 1}`;
      const temp = this.api.makeLiteralType(null);
      this.#aliases[ns].set(key, this.api.makeType(name, temp));
      this.#aliases[ns].set(key, this.api.makeType(name, produce()));
    }
    return this.api.ensureTypeNode(name);
  }

  constructor({
    config: { namespaces },
    actions,
    maxOverloads = 3,
  }: IntegrationParams) {
    this.api = new TypescriptAPI();
    this.#program.push(
      f.createImportDeclaration(
        undefined,
        f.createImportClause(
          ts.SyntaxKind.TypeKeyword,
          undefined,
          f.createNamedImports([
            f.createImportSpecifier(
              false,
              f.createIdentifier(this.#ids.socket),
              f.createIdentifier(this.#ids.socketBase),
            ),
          ]),
        ),
        f.createStringLiteral(this.#ids.ioClient),
      ),
    );

    for (const [ns, { emission }] of Object.entries(namespaces)) {
      this.#aliases[ns] = new Map<z.ZodTypeAny, ts.TypeAliasDeclaration>();
      this.registry[ns] = { emission: [], actions: [] };
      const commons = {
        makeAlias: this.#makeAlias.bind(this, ns),
        api: this.api,
      };
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

      const nsNameNode = this.api.makeConst(
        this.#ids.path,
        f.createStringLiteral(normalizeNS(ns)),
        { expose: true },
      );
      this.api.addJsDoc(
        nsNameNode,
        `@desc The actual path of the ${publicName} namespace`,
      );

      const interfaces = Object.entries(this.registry[ns]).map(
        ([scope, events]) =>
          this.api.makeInterface(
            makeCleanId(scope),
            events.map(({ event, node }) =>
              this.api.makeInterfaceProp(event, node),
            ),
            { expose: true },
          ),
      );
      const socketNode = this.api.makeType(
        this.#ids.socket,
        this.api.ensureTypeNode(this.#ids.socketBase, [
          this.#ids.emission,
          this.#ids.actions,
        ]),
        { expose: true },
      );
      this.api.addJsDoc(
        socketNode,
        `@example const socket: ${publicName}.${this.#ids.socket} = io(${publicName}.${this.#ids.path})`,
      );
      this.#program.push(
        f.createModuleDeclaration(
          this.api.exportModifier,
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
      .map((node) => this.api.printNode(node, printerOptions))
      .join("\n\n");
  }
}
