import { RemoteSocket } from "socket.io";
import { z } from "zod";
import { Metadata, parseMeta } from "./metadata";

export interface RemoteClient<D extends Metadata> {
  id: string;
  rooms: string[];
  getData: () => Readonly<z.output<D>>;
  setData: (next: z.input<D>) => void;
}

export const getRemoteClients = <D extends Metadata>(
  sockets: RemoteSocket<{}, z.output<D>>[],
  metaSchema: D | undefined,
): RemoteClient<D>[] =>
  sockets.map(({ id, rooms, data }) => ({
    id,
    rooms: Array.from(rooms),
    getData: () => parseMeta(data, metaSchema),
    setData: (next) => (data = parseMeta(next, metaSchema)),
  }));
