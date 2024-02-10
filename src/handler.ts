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

export interface ClientContext<E extends EmissionMap>
  extends IndependentContext<E> {
  /** @desc The sender of the incoming event */
  client: Client<E>;
}

export interface ActionContext<IN, E extends EmissionMap>
  extends ClientContext<E> {
  /** @desc Validated payload */
  input: IN;
}

export type Handler<CTX, OUT> = (params: CTX) => Promise<OUT>;
