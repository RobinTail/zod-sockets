import { init, last } from "ramda";
import type { Socket } from "socket.io";
import { z } from "zod";
import { ActionNoAckDef, ActionWithAckDef } from "./actions-factory";
import { Broadcaster, EmissionMap, Emitter, RoomService } from "./emission";
import { AbstractLogger } from "./logger";
import { RemoteClint } from "./utils";

export interface Client {
  /** @alias Socket.connected */
  isConnected: () => boolean;
  /** @alias Socket.id */
  id: Socket["id"];
  /** @desc Returns the list of the rooms the client in */
  getRooms: () => string[];
}

export interface HandlingFeatures<E extends EmissionMap> {
  /** @desc The owner of the received event */
  client: Client;
  logger: AbstractLogger;
  /**
   * @desc Emits towards the owner of the received event
   * @todo consider moving to "client"
   * */
  emit: Emitter<E>;
  /** @desc Emits to everyone */
  broadcast: Broadcaster<E>;
  /** @desc Provides room(s)-scope methods */
  withRooms: RoomService<E>;
  /** @desc Returns the list of available rooms */
  getAllRooms: () => string[];
  /** @desc Returns the list of familiar client */
  getAllClients: () => Promise<RemoteClint[]>;
}

export type Handler<IN, OUT, E extends EmissionMap> = (
  params: {
    input: IN;
  } & HandlingFeatures<E>,
) => Promise<OUT>;

export abstract class AbstractAction {
  public abstract execute(
    params: {
      event: string;
      params: unknown[];
    } & HandlingFeatures<EmissionMap>,
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
      | ActionWithAckDef<IN, OUT, EmissionMap>
      | ActionNoAckDef<IN, EmissionMap>,
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
  } & HandlingFeatures<EmissionMap>): Promise<void> {
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
