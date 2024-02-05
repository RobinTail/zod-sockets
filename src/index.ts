import http from "node:http";
import type { Server } from "socket.io";
import { ActionMap, Handler, SocketFeatures } from "./action";
import { EmissionMap, makeEmitter } from "./emission";
import { AbstractLogger } from "./logger";

export interface SocketsConfig<E extends EmissionMap> {
  timeout: number;
  emission: E;
}

export const createSocketsConfig = <E extends EmissionMap>(
  config: SocketsConfig<E>,
) => config;

export const attachSockets = <E extends EmissionMap>({
  io,
  actions,
  logger,
  target,
  config: { emission, timeout },
  onConnection = ({ socketId }) => logger.debug("User connected", socketId),
  onDisconnect = ({ socketId }) => logger.debug("User disconnected", socketId),
  onAnyEvent = ({ input: [event], socketId }) =>
    logger.debug(`${event} from ${socketId}`),
}: {
  io: Server;
  actions: ActionMap;
  logger: AbstractLogger;
  target: http.Server;
  config: SocketsConfig<E>;
  onConnection?: Handler<[], void, E>;
  onDisconnect?: Handler<[], void, E>;
  onAnyEvent?: Handler<[string], void, E>;
}): Server => {
  logger.info("ZOD-SOCKETS", target.address());
  io.on("connection", async (socket) => {
    const commons: SocketFeatures = {
      socketId: socket.id,
      isConnected: () => socket.connected,
    };
    const emit = makeEmitter({ emission, socket, logger, timeout });
    await onConnection({ input: [], logger, emit, ...commons });
    socket.onAny((event) =>
      onAnyEvent({ input: [event], logger, emit, ...commons }),
    );
    for (const [event, action] of Object.entries(actions)) {
      socket.on(event, async (...params) =>
        action.execute({ event, params, logger, emit, ...commons }),
      );
    }
    socket.on("disconnect", () =>
      onDisconnect({ input: [], logger, emit, ...commons }),
    );
  });
  return io.attach(target);
};
