import { RemoteSocket } from "socket.io";

export interface RemoteClient {
  id: string;
  rooms: string[];
  getData: <D extends object>() => Readonly<Partial<D>>;
  join: (rooms: string | string[]) => void | Promise<void>;
}

export const getRemoteClients = (sockets: RemoteSocket<{}, unknown>[]) =>
  sockets.map<RemoteClient>(({ id, rooms, data, join }) => ({
    id: id,
    rooms: Array.from(rooms),
    getData: <D extends object>() => (data as D) || {},
    join,
  }));
