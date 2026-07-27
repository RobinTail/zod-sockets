import { AbstractAction } from "./action";
import { makeCleanId } from "./common-helpers";
import { Config } from "./config";
import { makeEventFnSchema } from "./integration-helpers";
import { type Namespaces, normalizeNS } from "./namespace";
import { zodToTs } from "./zts";
import {
  ts,
  f,
  ensureTypeNode,
  printNode,
  makeInterfaceProp,
} from "./typescript-api";

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

export class Integration {
  readonly #program: Array<string | ((opts?: ts.PrinterOptions) => string)> =
    [];
  readonly #aliases: Record<string, Map<object, string>> = {}; // by namespace
  #ids = {
    path: "path",
    socket: "Socket",
    socketBase: "SocketBase",
    ioClient: "socket.io-client",
    emission: "Emission",
    actions: "Actions",
  };

  #makeAlias(ns: string, key: object, produce: () => ts.TypeNode): ts.TypeNode {
    let name = this.#aliases[ns].get(key);
    if (!name) {
      name = `Type${this.#aliases[ns].size + 1}`;
      this.#aliases[ns].set(key, name);
      const node = produce();
      this.#program.push((opts) => `type ${name} = ${printNode(node, opts)};`);
    }
    return ensureTypeNode(name);
  }

  constructor({
    config: { namespaces },
    actions,
    maxOverloads = 3,
  }: IntegrationParams) {
    this.#program.push(
      `import type { ${this.#ids.socket} as ${this.#ids.socketBase} } from "${this.#ids.ioClient}";`,
    );

    for (const [ns, { emission }] of Object.entries(namespaces)) {
      this.#aliases[ns] = new Map();
      const publicName = makeCleanId(ns) || makeCleanId(fallbackNs);
      const commons = { makeAlias: this.#makeAlias.bind(this, ns) };

      this.#program.push((opts) =>
        [
          `export namespace ${publicName} {`,
          `  /** @desc The actual path of the ${publicName} namespace */`,
          `  export const ${this.#ids.path} = ${printNode(f.createStringLiteral(normalizeNS(ns)), opts)};`,
        ].join("\n"),
      );

      const emissionNodes = Object.entries(emission).map(
        ([event, { schema, ack }]) => ({
          event,
          node: zodToTs(makeEventFnSchema(schema, ack, maxOverloads), {
            isResponse: true,
            ...commons,
          }),
        }),
      );

      this.#program.push(`  export interface ${this.#ids.emission} {`);
      for (const { event, node } of emissionNodes) {
        this.#program.push(
          (opts?: ts.PrinterOptions) =>
            `    ${printNode(makeInterfaceProp(event, node), opts)}`,
        );
      }

      this.#program.push(`  }`);

      const actionNodes = actions
        .filter(({ namespace }) => namespace === ns)
        .map(({ event, inputSchema, outputSchema }) => ({
          event,
          node: zodToTs(
            makeEventFnSchema(inputSchema, outputSchema, maxOverloads),
            { isResponse: false, ...commons },
          ),
        }));

      this.#program.push(`  export interface ${this.#ids.actions} {`);

      for (const { event, node } of actionNodes) {
        this.#program.push(
          (opts?: ts.PrinterOptions) =>
            `    ${printNode(makeInterfaceProp(event, node), opts)}`,
        );
      }

      this.#program.push(
        [
          `  }`,
          `  /** @example const socket: ${publicName}.${this.#ids.socket} = io(${publicName}.${this.#ids.path}) */`,
          `  export type ${this.#ids.socket} = ${this.#ids.socketBase}<${this.#ids.emission}, ${this.#ids.actions}>;`,
          `}`,
        ].join("\n"),
      );
    }
  }

  public print(printerOptions?: ts.PrinterOptions) {
    const parts = this.#program.map((entry) =>
      typeof entry === "function" ? entry(printerOptions) : entry,
    );
    return parts.join("\n\n");
  }
}
