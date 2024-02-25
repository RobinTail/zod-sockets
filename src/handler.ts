import { Client } from "./client";
import { Broadcaster, EmissionMap, RoomService } from "./emission";
import { AbstractLogger } from "./logger";
import { RemoteClient } from "./remote-client";

export interface IndependentContext<E extends EmissionMap> {
  logger: AbstractLogger;
  all: {
    /** @desc Returns the list of available rooms */
    getRooms: () => string[];
    /** @desc Returns the list of familiar clients */
    getClients: () => Promise<RemoteClient[]>;
    /** @desc Emits an event to everyone */
    broadcast: Broadcaster<E>;
  };
  /** @desc Provides room(s)-scope methods */
  withRooms: RoomService<E>;
}

export interface ClientContext<E extends EmissionMap, D extends object>
  extends IndependentContext<E> {
  /** @desc The sender of the incoming event */
  client: Client<E, D>;
}

export interface TracingContext<E extends EmissionMap, D extends object>
  extends ClientContext<E, D> {
  event: string;
  payload: unknown[];
}

export interface ActionContext<IN, E extends EmissionMap, D extends object>
  extends ClientContext<E, D> {
  /** @desc Validated payload */
  input: IN;
}

export type Handler<CTX, OUT> = (params: CTX) => Promise<OUT>;
