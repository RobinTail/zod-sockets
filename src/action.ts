import { init, last } from "ramda";
import type { Socket } from "socket.io";
import { z } from "zod";
import { ActionNoAckDef, ActionWithAckDef } from "./actions-factory";
import { Broadcaster, EmissionMap, Emitter, RoomService } from "./emission";
import { AbstractLogger } from "./logger";
import { Metadata } from "./metadata";
import { RemoteClient } from "./remote-client";

export interface Client<E extends EmissionMap, D extends Metadata> {
  /** @alias Socket.connected */
  isConnected: () => boolean;
  /** @alias Socket.id */
  id: Socket["id"];
  /** @desc Returns the list of the rooms the client in */
  getRooms: () => string[];
  /** @desc Sends a new event to the client (this is not acknowledgement) */
  emit: Emitter<E>;
  getData: () => Readonly<z.output<D>>;
  setData: (next: z.input<D>) => void;
}

export interface HandlingFeatures<E extends EmissionMap, D extends Metadata> {
  logger: AbstractLogger;
  /** @desc The scope of the owner of the received event */
  client: Client<E, D>;
  /** @desc The global scope */
  all: {
    /** @desc Emits to everyone */
    broadcast: Broadcaster<E>;
    /** @desc Returns the list of available rooms */
    getRooms: () => string[];
    /** @desc Returns the list of familiar clients */
    getClients: () => Promise<RemoteClient<D>[]>;
  };
  /** @desc Provides room(s)-scope methods */
  withRooms: RoomService<E, D>;
}

export type Handler<IN, OUT, E extends EmissionMap, D extends Metadata> = (
  params: {
    input: IN;
  } & HandlingFeatures<E, D>,
) => Promise<OUT>;

export abstract class AbstractAction {
  public abstract execute(
    params: {
      event: string;
      params: unknown[];
    } & HandlingFeatures<EmissionMap, Metadata>,
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
  readonly #handler: Handler<
    z.output<IN>,
    z.input<OUT> | void,
    EmissionMap,
    Metadata
  >;

  public constructor(
    action:
      | ActionWithAckDef<IN, OUT, EmissionMap, Metadata>
      | ActionNoAckDef<IN, EmissionMap, Metadata>,
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
    ...rest
  }: {
    event: string;
    params: unknown[];
  } & HandlingFeatures<EmissionMap, Metadata>): Promise<void> {
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
