import { init, last } from "ramda";
import { z } from "zod";
import { ActionNoAckDef, ActionWithAckDef } from "./actions-factory";
import { EmissionMap } from "./emission";
import { ActionContext, ClientContext, Handler } from "./handler";
import { Namespace, Namespaces, rootNS } from "./namespaces";

export abstract class AbstractAction {
  public abstract getEvent(): string;
  public abstract getNamespace(): string;
  public abstract execute(
    params: {
      event: string;
      params: unknown[];
    } & ClientContext<EmissionMap>,
  ): Promise<void>;
  public abstract getSchema(variant: "input"): z.AnyZodTuple;
  public abstract getSchema(variant: "output"): z.AnyZodTuple | undefined;
}

export class Action<
  IN extends z.AnyZodTuple,
  OUT extends z.AnyZodTuple,
> extends AbstractAction {
  readonly #event: string;
  readonly #namespace: string;
  readonly #inputSchema: IN;
  readonly #outputSchema: OUT | undefined;
  readonly #handler: Handler<
    ActionContext<z.output<IN>, EmissionMap>,
    z.input<OUT> | void
  >;

  public constructor(
    action:
      | ActionWithAckDef<IN, OUT, Namespaces<Namespace<EmissionMap>>, string>
      | ActionNoAckDef<IN, Namespaces<Namespace<EmissionMap>>, string>,
  ) {
    super();
    this.#event = action.event;
    this.#namespace = action.ns || rootNS;
    this.#inputSchema = action.input;
    this.#outputSchema = "output" in action ? action.output : undefined;
    this.#handler = action.handler;
  }

  public override getEvent(): string {
    return this.#event;
  }

  public override getNamespace(): string {
    return this.#namespace;
  }

  public override getSchema(variant: "input"): IN;
  public override getSchema(variant: "output"): OUT | undefined;
  public override getSchema(variant: "input" | "output") {
    return variant === "input" ? this.#inputSchema : this.#outputSchema;
  }

  /** @throws z.ZodError */
  #parseInput(params: unknown[]) {
    const payload = this.#outputSchema ? init(params) : params;
    return this.#inputSchema.parse(payload);
  }

  /** @throws z.ZodError */
  #parseAckCb(params: unknown[]) {
    if (!this.#outputSchema) {
      return undefined;
    }
    return z.function(this.#outputSchema, z.void()).parse(last(params));
  }

  /** @throws z.ZodError */
  #parseOutput(output: z.input<OUT> | void) {
    if (!this.#outputSchema) {
      return;
    }
    return this.#outputSchema.parse(output) as z.output<OUT>;
  }

  public override async execute({
    event,
    params,
    logger,
    ...rest
  }: {
    event: string;
    params: unknown[];
  } & ClientContext<EmissionMap>): Promise<void> {
    try {
      const input = this.#parseInput(params);
      logger.debug(
        `parsed input (${this.#outputSchema ? "excl." : "no"} ack)`,
        input,
      );
      const ack = this.#parseAckCb(params);
      const output = await this.#handler({ input, logger, ...rest });
      const response = this.#parseOutput(output);
      if (ack && response) {
        logger.debug("parsed output", response);
        ack(...response);
      }
    } catch (error) {
      logger.error(`${event} handling error`, error);
    }
  }
}
