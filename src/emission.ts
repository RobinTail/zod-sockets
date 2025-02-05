import assert from "node:assert/strict";
import type { RemoteSocket, Server, Socket } from "socket.io";
import { z } from "zod";
import {
  InputValidationError,
  OutputValidationError,
  parseWrapped,
} from "./errors";
import {
  RemoteClient,
  SomeRemoteSocket,
  makeRemoteClients,
} from "./remote-client";

export interface Emission {
  schema: z.AnyZodTuple;
  ack?: z.AnyZodTuple;
}

export type EmissionMap = Record<string, Emission>;

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
  getClients: () => Promise<RemoteClient<E, D>[]>;
};

export interface EmitterConfig<E extends EmissionMap> {
  emission: E;
  timeout: number;
}

export function makeEmitter<E extends EmissionMap>(
  props: { subject: Socket } & EmitterConfig<E>,
): Emitter<E>;
export function makeEmitter<E extends EmissionMap>(
  props: {
    subject: RemoteSocket<
      { [K in keyof E]: z.infer<z.ZodFunction<E[K]["schema"], z.ZodVoid>> },
      unknown
    >;
  } & EmitterConfig<E>,
): Emitter<E>;
export function makeEmitter<E extends EmissionMap>(
  props: { subject: Socket["broadcast"] | Server } & EmitterConfig<E>,
): Broadcaster<E>;
export function makeEmitter({
  subject,
  emission,
  timeout,
}: {
  subject: Socket | SomeRemoteSocket | Socket["broadcast"] | Server;
} & EmitterConfig<EmissionMap>) {
  const getSchemas = (event: string) => {
    const { schema, ack } = emission[event];
    return { schema, ack: ack && ("id" in subject ? ack : ack.array()) };
  };
  /**
   * @throws OutputValidationError on validating emission
   * @throws InputValidationError on validating acknowledgment
   * @throws Error on ack timeout or unsupported event
   * */
  return async (event: string, ...args: unknown[]) => {
    assert(event in emission, new Error(`Unsupported event ${event}`));
    const { schema, ack } = getSchemas(event);
    const payload = parseWrapped(schema, args, OutputValidationError);
    if (!ack) {
      return subject.emit(String(event), ...payload) || true;
    }
    const response = await subject
      .timeout(timeout)
      .emitWithAck(String(event), ...payload);
    return parseWrapped(ack, response, InputValidationError);
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
      makeRemoteClients({
        sockets: await subject.in(rooms).fetchSockets(),
        ...rest,
      }),
    broadcast: makeEmitter({
      ...rest,
      subject: subject.to(rooms),
    }),
  });
