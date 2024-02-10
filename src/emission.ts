import assert from "node:assert/strict";
import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { Config } from "./config";
import { RemoteClient, getRemoteClients } from "./remote-client";

export interface Emission {
  schema: z.AnyZodTuple;
  ack?: z.AnyZodTuple;
}

export interface EmissionMap {
  [event: string]: Emission;
}

type TupleOrTrue<T> = T extends z.AnyZodTuple ? T : z.ZodLiteral<true>;
type TuplesOrTrue<T> = T extends z.AnyZodTuple
  ? z.ZodArray<T>
  : z.ZodLiteral<true>;

export type Emitter<E extends EmissionMap> = <K extends keyof E>(
  evt: K,
  ...args: z.input<E[K]["schema"]>
) => Promise<z.output<TupleOrTrue<E[K]["ack"]>>>;

export type Broadcaster<E extends EmissionMap> = <K extends keyof E>(
  evt: K,
  ...args: z.input<E[K]["schema"]>
) => Promise<z.output<TuplesOrTrue<E[K]["ack"]>>>;

export type RoomService<E extends EmissionMap> = (rooms: string | string[]) => {
  /**
   * @desc Emits an event to all/others (depending on context) in the specified room(s)
   * @throws z.ZodError on validation
   * @throws Error on ack timeout
   * */
  broadcast: Broadcaster<E>;
  getClients: () => Promise<RemoteClient[]>;
};

/**
 * @throws z.ZodError on validation
 * @throws Error on ack timeout
 * */
export const makeEmitter = <T>({
  subject,
  config: { logger, emission, timeout },
}: {
  config: Config<EmissionMap>;
  subject: Socket | Socket["broadcast"] | Server;
}) =>
  (async (event: string, ...args: unknown[]) => {
    const isSocket = "id" in subject;
    assert(event in emission, new Error(`Unsupported event ${event}`));
    const { schema, ack } = emission[event];
    const payload = schema.parse(args);
    logger.debug(`Sending ${String(event)}`, payload);
    if (!ack) {
      return subject.emit(String(event), ...payload) || true;
    }
    const response = await subject
      .timeout(timeout)
      .emitWithAck(String(event), ...payload);
    return (isSocket ? ack : ack.array()).parse(response);
  }) as T;

export const makeRoomService =
  <E extends EmissionMap>({
    subject,
    ...rest
  }: {
    subject: Socket | Server;
    config: Config<E>;
  }): RoomService<E> =>
  (rooms) => ({
    getClients: async () =>
      getRemoteClients(await subject.in(rooms).fetchSockets()),
    broadcast: makeEmitter<Broadcaster<E>>({
      ...rest,
      subject: subject.to(rooms),
    }),
  });
