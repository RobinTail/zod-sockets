import { RemoteSocket } from "socket.io";
import { z } from "zod";

import { Distribution, makeDistribution } from "./distribution";

export interface RemoteClient<D extends z.SomeZodObject> extends Distribution {
  id: string;
  rooms: string[];
  getData: () => Readonly<Partial<z.infer<D>>>;
}

export const getRemoteClients = <D extends z.SomeZodObject>(
  sockets: RemoteSocket<{}, z.infer<D>>[],
) =>
  sockets.map<RemoteClient<D>>((socket) => ({
    id: socket.id,
    rooms: Array.from(socket.rooms),
    getData: () => socket.data || {},
    ...makeDistribution(socket),
  }));
