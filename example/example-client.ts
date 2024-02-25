import type { Socket as SocketBase } from "socket.io-client";

export namespace Root {
  export interface Emission {
    time: (currentIsoTime: string) => void;
    chat: (
      message: string,
      extraInfo: {
        /** the ID of author */
        from: string;
      },
    ) => void;
    rooms: (roomIds: string[]) => void;
  }
  export interface Actions {
    chat: (message: string) => void;
    ping:
      | ((cb1: (literally: "pong", ...echo: unknown[]) => void) => void)
      | ((
          anything1: unknown,
          cb2: (literally: "pong", ...echo: unknown[]) => void,
        ) => void)
      | ((
          anything1: unknown,
          anything2: unknown,
          cb3: (literally: "pong", ...echo: unknown[]) => void,
        ) => void)
      | ((
          anything1: unknown,
          anything2: unknown,
          anything3: unknown,
          cb4: (literally: "pong", ...echo: unknown[]) => void,
        ) => void);
    subscribe: (...doesNotMatter: unknown[]) => void;
  }
  /** @example const socket: Root.Socket = io("/") */
  export type Socket = SocketBase<Emission, Actions>;
}