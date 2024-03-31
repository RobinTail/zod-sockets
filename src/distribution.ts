import type { Socket } from "socket.io";
import { SomeRemoteSocket } from "./remote-client";

export interface Distribution {
  join: (rooms: string | string[]) => void | Promise<void>;
  leave: (rooms: string | string[]) => void | Promise<void>;
}

export const makeDistribution = (
  subject: Socket | SomeRemoteSocket,
): Distribution => ({
  join: subject.join.bind(subject),
  leave: (rooms) =>
    typeof rooms === "string"
      ? subject.leave(rooms)
      : Promise.all(rooms.map((room) => subject.leave(room))).then(() => {}),
});
