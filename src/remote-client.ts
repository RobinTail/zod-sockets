import type { RemoteSocket } from "socket.io";
import { z } from "zod/v4";
import { Distribution, makeDistribution } from "./distribution";
import { EmissionMap, Emitter, EmitterConfig, makeEmitter } from "./emission";

export type SomeRemoteSocket = RemoteSocket<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- meant to be any for assignment compatibility
  Record<string, (...args: any[]) => void>,
  unknown
>;

export interface RemoteClient<E extends EmissionMap, D extends z.ZodObject>
  extends Distribution {
  id: string;
  handshake: SomeRemoteSocket["handshake"];
  rooms: string[];
  getData: () => Readonly<Partial<z.infer<D>>>;
  emit: Emitter<E>;
}

export const makeRemoteClients = <
  E extends EmissionMap,
  D extends z.ZodObject,
>({
  sockets,
  ...rest
}: {
  sockets: SomeRemoteSocket[];
  metadata: D;
} & EmitterConfig<E>) =>
  sockets.map<RemoteClient<E, D>>((socket) => ({
    id: socket.id,
    handshake: socket.handshake,
    rooms: Array.from(socket.rooms),
    getData: () => (socket.data || {}) as Partial<z.infer<D>>,
    emit: makeEmitter({ subject: socket, ...rest }),
    ...makeDistribution(socket),
  }));
