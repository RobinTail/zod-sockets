import { z } from "zod";
import { EmissionMap } from "./emission";
import {
  ClientContext,
  ErrorContext,
  Handler,
  IndependentContext,
  TracingContext,
} from "./handler";
import type { DisconnectReason } from "socket.io";

export interface Hooks<E extends EmissionMap, D extends z.ZodObject> {
  /** @desc The place for emitting events regardless receiving events */
  onConnection: Handler<ClientContext<E, D>, void>;
  onDisconnect: Handler<
    ClientContext<E, D> & { reason: DisconnectReason },
    void
  >;
  onAnyIncoming: Handler<TracingContext<E, D>, void>;
  onAnyOutgoing: Handler<TracingContext<E, D>, void>;
  /** @desc The place for emitting events regardless clients activity */
  onStartup: Handler<IndependentContext<E, D>, void>;
  /** @desc The place for handling errors, in particular validation errors of the incoming events */
  onError: Handler<ErrorContext<E, D>, void>;
}

export const defaultHooks: Hooks<EmissionMap, z.ZodObject> = {
  onConnection: ({ client: { id, getData }, logger }) =>
    logger.debug("Client connected", { ...getData(), id }),
  onDisconnect: ({ client: { id, getData }, logger }) =>
    logger.debug("Client disconnected", { ...getData(), id }),
  onAnyIncoming: ({ event, client: { id, getData }, logger }) =>
    logger.debug(`${event} from ${id}`, getData()),
  onAnyOutgoing: ({ event, logger, payload }) =>
    logger.debug(`Sending ${event}`, payload),
  onStartup: ({ logger }) => logger.debug("Ready"),
  onError: ({ logger, event, error }) =>
    logger.error(event ? `${event} handling error` : "Error", error),
};
