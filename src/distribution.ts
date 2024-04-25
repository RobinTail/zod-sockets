import type { Socket } from "socket.io";
import { SomeRemoteSocket } from "./remote-client";

export interface Distribution {
  join: (rooms: string | string[]) => Promise<void>;
  leave: (rooms: string | string[]) => Promise<void>;
}

export const makeDistribution = (
  subject: Socket | SomeRemoteSocket,
): Distribution => ({
  join: async (rooms) => subject.join(rooms),
  leave: async (rooms) =>
    typeof rooms === "string"
      ? subject.leave(rooms)
      : Promise.all(rooms.map((room) => subject.leave(room))).then(() => {}),
});
