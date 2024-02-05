import { init, last } from "ramda";
import type { Socket } from "socket.io";
import { z } from "zod";
import { AckActionDef, SimpleActionDef } from "./actions-factory";
import { EmissionMap, Emitter } from "./emission";
import { AbstractLogger } from "./logger";

export interface SocketFeatures {
  isConnected: () => boolean;
  socketId: Socket["id"];
}

export type Handler<IN, OUT, E extends EmissionMap> = (
  params: {
    input: IN;
    logger: AbstractLogger;
    emit: Emitter<E>;
  } & SocketFeatures,
) => Promise<OUT>;

export abstract class AbstractAction {
  public abstract execute(
    params: {
      event: string;
      params: unknown[];
      logger: AbstractLogger;
      emit: Emitter<EmissionMap>;
    } & SocketFeatures,
  ): Promise<void>;
}

export interface ActionMap {
  [event: string]: AbstractAction;
}

export class Action<
  IN extends z.AnyZodTuple,
  OUT extends z.AnyZodTuple,
> extends AbstractAction {
  readonly #inputSchema: IN;
  readonly #outputSchema: OUT | undefined;
  readonly #handler: Handler<z.output<IN>, z.input<OUT> | void, EmissionMap>;

  public constructor(
    action:
      | AckActionDef<IN, OUT, EmissionMap>
      | SimpleActionDef<IN, EmissionMap>,
  ) {
    super();
    this.#inputSchema = action.input;
    this.#outputSchema = "output" in action ? action.output : undefined;
    this.#handler = action.handler;
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
    emit,
    ...rest
  }: {
    event: string;
    params: unknown[];
    logger: AbstractLogger;
    emit: Emitter<EmissionMap>;
  } & SocketFeatures): Promise<void> {
    try {
      const input = this.#parseInput(params);
      logger.debug(
        `parsed input (${this.#outputSchema ? "excl." : "no"} ack)`,
        input,
      );
      const ack = this.#parseAckCb(params);
      const output = await this.#handler({ input, logger, emit, ...rest });
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
