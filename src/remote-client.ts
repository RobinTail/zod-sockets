import { RemoteSocket } from "socket.io";

import { Distribution, makeDistribution } from "./distribution";

export interface RemoteClient extends Distribution {
  id: string;
  rooms: string[];
  getData: <D extends object>() => Readonly<Partial<D>>;
}

// @todo figure out on metadata type
export const getRemoteClients = (sockets: RemoteSocket<{}, unknown>[]) =>
  sockets.map<RemoteClient>((socket) => ({
    id: socket.id,
    rooms: Array.from(socket.rooms),
    getData: <D extends object>() => (socket.data as D) || {},
    ...makeDistribution(socket),
  }));
