import { init, last } from "ramda";
import { z } from "zod";
import { ActionNoAckDef, ActionWithAckDef } from "./actions-factory";
import { EmissionMap } from "./emission";
import { ActionContext, ClientContext, Handler } from "./handler";
import { Namespaces, rootNS } from "./namespace";

export abstract class AbstractAction {
  public abstract getEvent(): string;
  public abstract getNamespace(): keyof any;
  public abstract execute(
    params: {
      event: string;
      params: unknown[];
    } & ClientContext<EmissionMap, z.SomeZodObject>,
  ): Promise<void>;
  public abstract getSchema(variant: "input"): z.AnyZodTuple;
  public abstract getSchema(variant: "output"): z.AnyZodTuple | undefined;
  public abstract example(
    variant: "input" | "output",
    payload: unknown[],
  ): this;
  public abstract getExamples(variant: "input" | "output"): unknown[];
}

export class Action<
  IN extends z.AnyZodTuple,
  OUT extends z.AnyZodTuple,
  NS extends Namespaces,
> extends AbstractAction {
  readonly #event: string;
  readonly #namespace: keyof NS;
  readonly #inputSchema: IN;
  readonly #outputSchema: OUT | undefined;
  readonly #examples: Array<{
    variant: "input" | "output";
    payload: Array<z.input<IN> | z.output<OUT>>;
  }>;
  readonly #handler: Handler<
    ActionContext<z.output<IN>, EmissionMap, z.SomeZodObject>,
    z.input<OUT> | void
  >;

  public constructor(
    action:
      | ActionWithAckDef<IN, OUT, NS, keyof NS>
      | ActionNoAckDef<IN, NS, keyof NS>,
  ) {
    super();
    this.#event = action.event;
    this.#namespace = action.ns || rootNS;
    this.#inputSchema = action.input;
    this.#outputSchema = "output" in action ? action.output : undefined;
    this.#examples = [];
    this.#handler = action.handler;
  }

  public override getEvent(): string {
    return this.#event;
  }

  public override getNamespace(): keyof NS {
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
  } & ClientContext<EmissionMap, z.SomeZodObject>): Promise<void> {
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

  public override example(variant: "input", payload: z.input<IN>): this;
  public override example(
    variant: "output",
    payload: OUT extends z.AnyZodTuple ? z.output<OUT> : never,
  ): this;
  public override example(
    variant: "input" | "output",
    payload: z.input<IN> | z.output<OUT>,
  ): this {
    this.#examples.push({ variant, payload });
    return this;
  }

  public override getExamples(variant: "input"): z.input<IN>[];
  public override getExamples(variant: "output"): z.output<OUT>[];
  public override getExamples(variant: "input" | "output") {
    return this.#examples
      .filter((entry) => entry.variant === variant)
      .map(({ payload }) => payload);
  }
}
