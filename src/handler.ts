import { z } from "zod";
import { Client } from "./client";
import { Broadcaster, EmissionMap, RoomService } from "./emission";
import { AbstractLogger } from "./logger";
import { RemoteClient } from "./remote-client";

export interface IndependentContext<
  E extends EmissionMap,
  D extends z.ZodObject,
> {
  logger: AbstractLogger;
  all: {
    /** @desc Returns the list of available rooms */
    getRooms: () => string[];
    /** @desc Returns the list of familiar clients */
    getClients: () => Promise<RemoteClient<E, D>[]>;
    /** @desc Emits an event to everyone */
    broadcast: Broadcaster<E>;
  };
  /** @desc Provides room(s)-scope methods */
  withRooms: RoomService<E, D>;
}

export interface ClientContext<E extends EmissionMap, D extends z.ZodObject>
  extends IndependentContext<E, D> {
  /** @desc The sender of the incoming event */
  client: Client<E, D>;
}

export interface TracingContext<E extends EmissionMap, D extends z.ZodObject>
  extends ClientContext<E, D> {
  event: string;
  payload: unknown[];
}

export interface ErrorContext<E extends EmissionMap, D extends z.ZodObject>
  extends IndependentContext<E, D>,
    Partial<Pick<TracingContext<E, D>, "event" | "payload" | "client">> {
  error: Error;
}

export interface ActionContext<IN, E extends EmissionMap, D extends z.ZodObject>
  extends ClientContext<E, D> {
  /** @desc Validated payload */
  input: IN;
}

export type Handler<CTX, OUT> = (params: CTX) => Promise<OUT>;
