import type { Socket as SocketBase } from "socket.io-client";

export namespace Root {
  export interface Emission {
    time: (currentIsoTime: string) => void;
    chat: (
      message: string,
      extraInfo: {
        /** the author ID */
        from: string;
      },
    ) => void;
    rooms: (roomIds: string[]) => void;
  }
  export interface Actions {
    chat: (message: string) => void;
    ping: (
      cb1: (literally: "pong", ...theEchoOfTheInput: unknown[]) => void,
    ) => void;
    subscribe: () => void;
  }
  /** @example const socket: Root.Socket = io("/") */
  export type Socket = SocketBase<Emission, Actions>;
}
