type Time = (p1: string) => void;

type Chat = (
  p1: string,
  p2: {
    from: string;
  },
) => void;

type Rooms = (p1: string[]) => void;

type Chat = (p1: string) => void;

type Ping = (p1: (p1: "pong", ...rest: any) => void) => void;

type Subscribe = () => void;

export interface Actions {
  chat: Chat;
  ping: Ping;
  subscribe: Subscribe;
}

export interface Emission {
  time: Time;
  chat: Chat;
  rooms: Rooms;
}
