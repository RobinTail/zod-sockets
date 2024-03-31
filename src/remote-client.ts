import type { RemoteSocket } from "socket.io";
import { z } from "zod";
import { Distribution, makeDistribution } from "./distribution";
import { EmissionMap, Emitter, EmitterConfig, makeEmitter } from "./emission";

export type SomeRemoteSocket = RemoteSocket<
  Record<string, (...args: any[]) => void>,
  unknown
>;

export interface RemoteClient<E extends EmissionMap, D extends z.SomeZodObject>
  extends Distribution {
  id: string;
  rooms: string[];
  getData: () => Readonly<Partial<z.infer<D>>>;
  emit: Emitter<E>;
}

export const makeRemoteClients = <
  E extends EmissionMap,
  D extends z.SomeZodObject,
>({
  sockets,
  ...rest
}: {
  sockets: SomeRemoteSocket[];
  metadata: D;
} & EmitterConfig<E>) =>
  sockets.map<RemoteClient<E, D>>((socket) => ({
    id: socket.id,
    rooms: Array.from(socket.rooms),
    getData: () => (socket.data || {}) as Partial<D>,
    emit: makeEmitter({ subject: socket, ...rest }),
    ...makeDistribution(socket),
  }));
