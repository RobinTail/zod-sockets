type Time = (p1: string) => void;

type Chat = (
  p1: string,
  p2: {
    from: string;
  },
) => void;

type Rooms = (p1: string[]) => void;

export interface Emission {
  time: Time;
  chat: Chat;
  rooms: Rooms;
}
