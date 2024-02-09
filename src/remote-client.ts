import { RemoteSocket } from "socket.io";

export interface RemoteClient {
  id: string;
  rooms: string[];
}

export const getRemoteClients = (
  sockets: RemoteSocket<{}, unknown>[],
): RemoteClient[] =>
  sockets.map(({ id, rooms }) => ({ id, rooms: Array.from(rooms) }));
