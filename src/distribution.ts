import { RemoteSocket, Socket } from "socket.io";

export interface Distribution {
  join: (rooms: string | string[]) => void | Promise<void>;
  leave: (rooms: string | string[]) => void | Promise<void>;
}

export const makeDistribution = (
  subject: Socket | RemoteSocket<{}, unknown>,
): Distribution => ({
  join: subject.join,
  leave: (rooms) =>
    typeof rooms === "string"
      ? subject.leave(rooms)
      : Promise.all(rooms.map((room) => subject.leave(room))).then(() => {}),
});
