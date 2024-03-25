import assert from "node:assert/strict";
import type { Server, Socket } from "socket.io";
import { z } from "zod";
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

export type RoomService<E extends EmissionMap, D extends z.SomeZodObject> = (
  rooms: string | string[],
) => {
  /**
   * @desc Emits an event to all/others (depending on context) in the specified room(s)
   * @throws z.ZodError on validation
   * @throws Error on ack timeout
   * */
  broadcast: Broadcaster<E>;
  getClients: () => Promise<RemoteClient<D>[]>;
};

export interface EmitterConfig<E extends EmissionMap> {
  emission: E;
  timeout: number;
}

export function makeEmitter<E extends EmissionMap>(
  props: { subject: Socket } & EmitterConfig<E>,
): Emitter<EmissionMap>;
export function makeEmitter<E extends EmissionMap>(
  props: { subject: Socket["broadcast"] | Server } & EmitterConfig<E>,
): Broadcaster<EmissionMap>;
export function makeEmitter({
  subject,
  emission,
  timeout,
}: {
  subject: Socket | Socket["broadcast"] | Server;
} & EmitterConfig<EmissionMap>) {
  /**
   * @throws z.ZodError on validation
   * @throws Error on ack timeout
   * */
  return async (event: string, ...args: unknown[]) => {
    const isSocket = "id" in subject;
    assert(event in emission, new Error(`Unsupported event ${event}`));
    const { schema, ack } = emission[event];
    const payload = schema.parse(args);
    if (!ack) {
      return subject.emit(String(event), ...payload) || true;
    }
    const response = await subject
      .timeout(timeout)
      .emitWithAck(String(event), ...payload);
    return (isSocket ? ack : ack.array()).parse(response);
  };
}

export const makeRoomService =
  <E extends EmissionMap, D extends z.SomeZodObject>({
    subject,
    ...rest
  }: {
    subject: Socket | Server;
    metadata: D;
  } & EmitterConfig<E>): RoomService<E, D> =>
  (rooms) => ({
    getClients: async () =>
      getRemoteClients(await subject.in(rooms).fetchSockets()),
    broadcast: makeEmitter({
      ...rest,
      subject: subject.to(rooms),
    }),
  });
