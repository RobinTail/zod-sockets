import type ts from "typescript";
import { z } from "zod";
import { AbstractAction } from "./action";
import { makeCleanId } from "./common-helpers";
import { Config } from "./config";
import { makeEventFnSchema } from "./integration-helpers";
import { Namespaces, normalizeNS } from "./namespace";
import { zodToTs } from "./zts";
import { TypescriptAPI } from "./typescript-api";

interface IntegrationParams {
  typescript: typeof ts;
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
    typescript,
    config: { namespaces },
    actions,
    maxOverloads = 3,
  }: IntegrationParams) {
    this.api = new TypescriptAPI(typescript);
    this.#program.push(
      this.api.f.createImportDeclaration(
        undefined,
        this.api.f.createImportClause(
          true,
          undefined,
          this.api.f.createNamedImports([
            this.api.f.createImportSpecifier(
              false,
              this.api.f.createIdentifier(this.#ids.socket),
              this.api.f.createIdentifier(this.#ids.socketBase),
            ),
          ]),
        ),
        this.api.f.createStringLiteral(this.#ids.ioClient),
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
        this.api.f.createStringLiteral(normalizeNS(ns)),
        { expose: true },
      );
      this.api.addJsDoc(
        nsNameNode,
        `@desc The actual path of the ${publicName} namespace`,
      );

      const interfaces = Object.entries(this.registry[ns]).map(
        ([scope, events]) =>
          this.api.f.createInterfaceDeclaration(
            this.api.exportModifier,
            makeCleanId(scope),
            undefined,
            undefined,
            events.map(({ event, node }) =>
              this.api.f.createPropertySignature(
                undefined,
                event,
                undefined,
                node,
              ),
            ),
          ),
      );
      const socketNode = this.api.f.createTypeAliasDeclaration(
        this.api.exportModifier,
        this.#ids.socket,
        undefined,
        this.api.f.createTypeReferenceNode(this.#ids.socketBase, [
          this.api.f.createTypeReferenceNode(this.#ids.emission),
          this.api.f.createTypeReferenceNode(this.#ids.actions),
        ]),
      );
      this.api.addJsDoc(
        socketNode,
        `@example const socket: ${publicName}.${this.#ids.socket} = io(${publicName}.${this.#ids.path})`,
      );
      this.#program.push(
        this.api.f.createModuleDeclaration(
          this.api.exportModifier,
          this.api.f.createIdentifier(publicName),
          this.api.f.createModuleBlock([
            nsNameNode,
            ...this.#aliases[ns].values(),
            ...interfaces,
            socketNode,
          ]),
          this.api.ts.NodeFlags.Namespace,
        ),
      );
    }
  }

  public static async create(params: Omit<IntegrationParams, "typescript">) {
    return new Integration({
      ...params,
      typescript: (await import("typescript"))["default"],
    });
  }

  public print(printerOptions?: ts.PrinterOptions) {
    return this.#program
      .map((node) => this.api.printNode(node, printerOptions))
      .join("\n\n");
  }
}
