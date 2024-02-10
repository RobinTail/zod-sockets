import { Client } from "./client";
import { EmissionMap, RoomService } from "./emission";
import { AbstractLogger } from "./logger";
import { RemoteClient } from "./remote-client";

export interface HandlingFeatures<E extends EmissionMap> {
  logger: AbstractLogger;
  /** @desc The scope of the owner of the received event */
  client: Client<E>;
  /** @desc Returns the list of available rooms */
  getAllRooms: () => string[];
  /** @desc Returns the list of familiar clients */
  getAllClients: () => Promise<RemoteClient[]>;
  /** @desc Provides room(s)-scope methods */
  withRooms: RoomService<E>;
}

export type Handler<IN, OUT, E extends EmissionMap> = (
  params: {
    input: IN;
  } & HandlingFeatures<E>,
) => Promise<OUT>;
