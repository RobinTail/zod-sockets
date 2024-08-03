import { init, last } from "ramda";
import { z } from "zod";
import { ActionNoAckDef, ActionWithAckDef } from "./actions-factory";
import { EmissionMap } from "./emission";
import { OutputValidationError, InputValidationError } from "./errors";
import { ActionContext, ClientContext, Handler } from "./handler";
import { Namespaces, rootNS } from "./namespace";

export abstract class AbstractAction {
  public abstract getEvent(): string;
  public abstract getNamespace(): PropertyKey;
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
    payload: z.infer<z.AnyZodTuple>,
  ): this;
  public abstract getExamples(
    variant: "input" | "output",
  ): z.infer<z.AnyZodTuple>[];
}

export class Action<
  NS extends Namespaces,
  IN extends z.AnyZodTuple,
  OUT extends z.AnyZodTuple | undefined = undefined,
> extends AbstractAction {
  readonly #event: string;
  readonly #namespace: keyof NS;
  readonly #inputSchema: IN;
  readonly #outputSchema: OUT;
  readonly #examples: Array<{
    variant: "input" | "output";
    payload: Array<
      z.input<IN> | (OUT extends z.AnyZodTuple ? z.output<OUT> : never)
    >;
  }>;
  readonly #handler: Handler<
    ActionContext<z.output<IN>, EmissionMap, z.SomeZodObject>,
    z.input<z.AnyZodTuple> | void // type compliance fix here
  >;

  public constructor(
    action:
      | ActionWithAckDef<IN, NonNullable<OUT>, NS, keyof NS>
      | ActionNoAckDef<IN, NS, keyof NS>,
  ) {
    super();
    this.#event = action.event;
    this.#namespace = action.ns || rootNS;
    this.#inputSchema = action.input;
    this.#outputSchema =
      "output" in action ? action.output : (undefined as OUT);
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
  public override getSchema(variant: "output"): OUT;
  public override getSchema(variant: "input" | "output") {
    return variant === "input" ? this.#inputSchema : this.#outputSchema;
  }

  /** @throws InputValidationError */
  #parseInput(params: unknown[]) {
    const payload = this.#outputSchema ? init(params) : params;
    try {
      return this.#inputSchema.parse(payload);
    } catch (e) {
      throw e instanceof z.ZodError ? new InputValidationError(e) : e;
    }
  }

  /** @throws InputValidationError */
  #parseAckCb(params: unknown[]) {
    if (!this.#outputSchema) {
      return undefined;
    }
    try {
      return z
        .function(this.#outputSchema, z.void())
        .parse(last(params), { path: [params.length - 1] });
    } catch (e) {
      throw e instanceof z.ZodError ? new InputValidationError(e) : e;
    }
  }

  /** @throws OutputValidationError */
  #parseOutput(output: z.input<NonNullable<OUT>> | void) {
    if (!this.#outputSchema) {
      return;
    }
    try {
      return this.#outputSchema.parse(output) as z.output<NonNullable<OUT>>;
    } catch (e) {
      throw e instanceof z.ZodError ? new OutputValidationError(e) : e;
    }
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
    const input = this.#parseInput(params);
    logger.debug(
      `${event}: parsed input (${this.#outputSchema ? "excl." : "no"} ack)`,
      input,
    );
    const ack = this.#parseAckCb(params); // @todo maybe should parse them all together?
    const output = await this.#handler({ input, logger, ...rest });
    const response = this.#parseOutput(output);
    if (ack && response) {
      logger.debug(`${event}: parsed output`, response);
      ack(...response);
    }
  }

  public override example(variant: "input", payload: z.input<IN>): this;
  public override example(
    variant: "output",
    payload: OUT extends z.AnyZodTuple ? z.output<OUT> : never,
  ): this;
  public override example(
    variant: "input" | "output",
    payload: z.input<IN> | (OUT extends z.AnyZodTuple ? z.output<OUT> : never),
  ): this {
    this.#examples.push({ variant, payload });
    return this;
  }

  public override getExamples(variant: "input"): z.input<IN>[];
  public override getExamples(
    variant: "output",
  ): OUT extends z.AnyZodTuple ? z.output<OUT>[] : never;
  public override getExamples(variant: "input" | "output") {
    return this.#examples
      .filter((entry) => entry.variant === variant)
      .map(({ payload }) => payload);
  }
}
