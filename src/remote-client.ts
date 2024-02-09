import { RemoteSocket } from "socket.io";

export interface RemoteClient {
  id: string;
  rooms: string[];
  getData: <D extends object>() => Readonly<D>;
}

export const getRemoteClients = (
  sockets: RemoteSocket<{}, unknown>[],
): RemoteClient[] =>
  sockets.map(({ id, rooms, data }) => ({
    id: id,
    rooms: Array.from(rooms),
    getData: <D>() => data as D,
  }));
