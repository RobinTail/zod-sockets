import assert from "node:assert/strict";
import type { Socket } from "socket.io";
import { z } from "zod";
import { Config } from "./config";
import { RemoteClint, getRemoteClients } from "./remote-client";

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
  broadcast: Broadcaster<E>;
  join: () => void | Promise<void>;
  leave: () => void | Promise<void>;
  getClients: () => Promise<RemoteClint[]>;
};

/**
 * @throws z.ZodError on validation
 * @throws Error on ack timeout
 * */
const makeGenericEmitter =
  ({
    target,
    config: { logger, emission, timeout },
  }: {
    config: Config<EmissionMap>;
    target: Socket | Socket["broadcast"];
  }) =>
  async (event: string, ...args: unknown[]) => {
    const isSocket = "id" in target;
    assert(event in emission, new Error(`Unsupported event ${event}`));
    const { schema, ack } = emission[event];
    const payload = schema.parse(args);
    logger.debug(
      `${isSocket ? "Emitting" : "Broadcasting"} ${String(event)}`,
      payload,
    );
    if (!ack) {
      return target.emit(String(event), ...payload) || true;
    }
    const response = await target
      .timeout(timeout)
      .emitWithAck(String(event), ...payload);
    return (isSocket ? ack : ack.array()).parse(response);
  };

interface MakerParams<E extends EmissionMap> {
  socket: Socket;
  config: Config<E>;
}

export const makeEmitter = <E extends EmissionMap>({
  socket: target,
  ...rest
}: MakerParams<E>) => makeGenericEmitter({ ...rest, target }) as Emitter<E>;

export const makeBroadcaster = <E extends EmissionMap>({
  socket: { broadcast: target },
  ...rest
}: MakerParams<E>) => makeGenericEmitter({ ...rest, target }) as Broadcaster<E>;

export const makeRoomService =
  <E extends EmissionMap>({
    socket,
    ...rest
  }: MakerParams<E>): RoomService<E> =>
  (rooms) => ({
    getClients: async () =>
      getRemoteClients(await socket.in(rooms).fetchSockets()),
    join: () => socket.join(rooms),
    leave: () =>
      typeof rooms === "string"
        ? socket.leave(rooms)
        : Promise.all(rooms.map((room) => socket.leave(room))).then(() => {}),
    broadcast: makeGenericEmitter({
      ...rest,
      target: socket.to(rooms),
    }) as Broadcaster<E>,
  });
