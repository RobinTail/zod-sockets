export interface Actions {
  chat: (p1: string) => void;
  ping: (p1: (p1: "pong", ...rest: unknown[]) => void) => void;
  subscribe: () => void;
}

export interface Emission {
  time: (p1: string) => void;
  chat: (
    p1: string,
    p2: {
      from: string;
    },
  ) => void;
  rooms: (p1: string[]) => void;
}
