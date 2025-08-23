import * as R from "ramda";
import { z } from "zod";
import { ActionNoAckDef, ActionWithAckDef } from "./actions-factory";
import { EmissionMap } from "./emission";
import { OutputValidationError, InputValidationError } from "./errors";
import { ActionContext, ClientContext, Handler } from "./handler";
import { Namespaces, rootNS } from "./namespace";

export abstract class AbstractAction {
  /** @internal */
  public abstract get event(): string;
  /** @internal */
  public abstract get namespace(): PropertyKey;
  public abstract execute(
    params: {
      params: unknown[];
    } & ClientContext<EmissionMap, z.ZodObject>,
  ): Promise<void>;
  /** @internal */
  public abstract get inputSchema(): z.ZodTuple;
  /** @internal */
  public abstract get outputSchema(): z.ZodTuple | undefined;
}

export class Action<
  NS extends Namespaces,
  IN extends z.ZodTuple,
  OUT extends z.ZodTuple | undefined = undefined,
> extends AbstractAction {
  readonly #event: string;
  readonly #namespace: keyof NS;
  readonly #inputSchema: IN;
  readonly #outputSchema: OUT;
  readonly #handler: Handler<
    ActionContext<z.output<IN>, EmissionMap, z.ZodObject>,
    z.input<NonNullable<OUT>> | void
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
    this.#handler = action.handler;
  }

  public override get event(): string {
    return this.#event;
  }

  public override get namespace(): keyof NS {
    return this.#namespace;
  }

  public override get inputSchema(): IN {
    return this.#inputSchema;
  }
  public override get outputSchema(): OUT {
    return this.#outputSchema;
  }

  /** @throws InputValidationError */
  #parseInput(params: unknown[]) {
    const payload = this.#outputSchema ? R.init(params) : params;
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
        .function<
          z.ZodTuple,
          z.ZodVoid
        >({ input: this.#outputSchema, output: z.void() })
        .parse(R.last(params)); // @todo path? [Math.max(0, params.length - 1)]
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
    params,
    logger,
    ...rest
  }: { params: unknown[] } & ClientContext<
    EmissionMap,
    z.ZodObject
  >): Promise<void> {
    const input = this.#parseInput(params);
    logger.debug(
      `${this.#event}: parsed input (${this.#outputSchema ? "excl." : "no"} ack)`,
      input,
    );
    const ack = this.#parseAckCb(params);
    const output = await this.#handler({ input, logger, ...rest });
    const response = this.#parseOutput(output);
    if (ack && response) {
      logger.debug(`${this.#event}: parsed output`, response);
      ack(...response);
    }
  }
}
