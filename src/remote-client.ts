import { RemoteSocket } from "socket.io";

export interface RemoteClient {
  id: string;
  rooms: string[];
  getData: <D extends object>() => Readonly<D>;
}

export const getRemoteClients = (sockets: RemoteSocket<{}, unknown>[]) =>
  sockets.map<RemoteClient>(({ id, rooms, data }) => ({
    id: id,
    rooms: Array.from(rooms),
    getData: <D extends object>() => data as D,
  }));
