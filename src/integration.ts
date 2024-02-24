import { createHash } from "node:crypto";
import ts from "typescript";
import { z } from "zod";
import { AbstractAction } from "./action";
import { Config } from "./config";
import { EmissionMap } from "./emission";
import { Namespaces } from "./namespaces";
import { zodToTs } from "./zts";
import { createTypeAlias, printNode } from "./zts-helpers";

const f = ts.factory;
const exportModifier = [f.createModifier(ts.SyntaxKind.ExportKeyword)];

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

export const ucFirst = (subject: string) =>
  subject.charAt(0).toUpperCase() + subject.slice(1).toLowerCase();

export const lcFirst = (subject: string) =>
  subject.charAt(0).toLowerCase() + subject.slice(1);

export const makeCleanId = (...args: string[]) =>
  args
    .flatMap((entry) => entry.split(/[^A-Z0-9]/gi)) // split by non-alphanumeric characters
    .flatMap((entry) =>
      // split by sequences of capitalized letters
      entry.replaceAll(/[A-Z]+/g, (beginning) => `/${beginning}`).split("/"),
    )
    .map(ucFirst)
    .join("");

export const defaultSerializer = (schema: z.ZodTypeAny): string =>
  createHash("sha1").update(JSON.stringify(schema), "utf8").digest("hex");

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
        const params: z.ZodTypeAny[] = schema.items;
        if (ack) {
          params.push(z.function(ack, z.void()));
        }
        const node = zodToTs({
          schema: z.function(z.tuple(params as z.ZodTupleItems), z.void()),
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
        const params: z.ZodTypeAny[] = action.getSchema("input").items;
        const output = action.getSchema("output");
        if (output) {
          params.push(z.function(output, z.void()));
        }
        const node = zodToTs({
          schema: z.function(z.tuple(params as z.ZodTupleItems), z.void()),
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
      this.program.push(
        f.createModuleDeclaration(
          exportModifier,
          f.createIdentifier(makeCleanId(ns) || makeCleanId("root")),
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
