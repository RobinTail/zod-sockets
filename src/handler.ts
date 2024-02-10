import { Client } from "./client";
import { EmissionMap, RoomService } from "./emission";
import { AbstractLogger } from "./logger";
import { RemoteClient } from "./remote-client";

export interface IndependentContext<E extends EmissionMap> {
  logger: AbstractLogger;
  /** @desc Returns the list of available rooms */
  getAllRooms: () => string[];
  /** @desc Returns the list of familiar clients */
  getAllClients: () => Promise<RemoteClient[]>;
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
