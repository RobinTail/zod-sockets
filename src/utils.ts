import { RemoteSocket } from "socket.io";

export interface RemoteClint {
  id: string;
  rooms: string[];
}

export const mapFetchedSockets = (
  sockets: RemoteSocket<{}, unknown>[],
): RemoteClint[] =>
  sockets.map(({ id, rooms }) => ({ id, rooms: Array.from(rooms) }));
