import { createHash } from "node:crypto";
import ts from "typescript";
import { z } from "zod";
import { Config } from "./config";
import { EmissionMap } from "./emission";
import { Namespaces } from "./namespaces";
import { zodToTs } from "./zts";
import { createTypeAlias, printNode } from "./zts-helpers";

const f = ts.factory;

interface IntegrationProps {
  config: Config<Namespaces<EmissionMap>>;
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

  protected getAlias(name: string): ts.TypeReferenceNode | undefined {
    return name in this.aliases ? f.createTypeReferenceNode(name) : undefined;
  }

  protected makeAlias(name: string, type: ts.TypeNode): ts.TypeReferenceNode {
    this.aliases[name] = createTypeAlias(type, name);
    return this.getAlias(name)!;
  }

  constructor({
    config: { emission: namespaces },
    serializer = defaultSerializer,
    optionalPropStyle = { withQuestionMark: true, withUndefined: true },
  }: IntegrationProps) {
    for (const [ns, emission] of Object.entries(namespaces)) {
      for (const [event, { schema, ack }] of Object.entries(emission)) {
        const id = makeCleanId(ns, event);
        // @todo those should be functions
        const node = zodToTs({
          schema,
          isResponse: true,
          getAlias: this.getAlias.bind(this),
          makeAlias: this.makeAlias.bind(this),
          serializer,
          optionalPropStyle,
        });
        const entry = createTypeAlias(node, id);
        this.program.push(entry);
      }
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
