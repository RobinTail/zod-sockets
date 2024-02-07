import http from "node:http";
import type { Server } from "socket.io";
import { ActionMap, Handler, SocketFeatures } from "./action";
import { SocketsConfig } from "./config";
import {
  EmissionMap,
  makeBroadcaster,
  makeEmitter,
  makeRoomService,
} from "./emission";

export const attachSockets = <E extends EmissionMap>({
  io,
  actions,
  target,
  config: { emission, timeout, logger },
  onConnection = ({ socketId }) => logger.debug("User connected", socketId),
  onDisconnect = ({ socketId }) => logger.debug("User disconnected", socketId),
  onAnyEvent = ({ input: [event], socketId }) =>
    logger.debug(`${event} from ${socketId}`),
}: {
  /**
   * @desc The Socket.IO server
   * @example new Server()
   * */
  io: Server;
  /**
   * @desc the object declares handling rules of the incoming socket.io events
   * @example { ping: onPing }
   * */
  actions: ActionMap;
  /**
   * @desc HTTP or HTTPS server to attach the sockets to
   * @example http.createServer().listen(8090)
   * */
  target: http.Server;
  /** @desc The configuration describing the emission (outgoing events) */
  config: SocketsConfig<E>;
  /** @desc A place for emitting events unrelated to the incoming events */
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
    const broadcast = makeBroadcaster({ emission, socket, logger, timeout });
    const rooms = makeRoomService({ emission, socket, logger, timeout });
    await onConnection({
      input: [],
      logger,
      emit,
      broadcast,
      rooms,
      ...commons,
    });
    socket.onAny((event) =>
      onAnyEvent({
        input: [event],
        logger,
        emit,
        broadcast,
        rooms,
        ...commons,
      }),
    );
    for (const [event, action] of Object.entries(actions)) {
      socket.on(event, async (...params) =>
        action.execute({
          event,
          params,
          logger,
          emit,
          broadcast,
          rooms,
          ...commons,
        }),
      );
    }
    socket.on("disconnect", () =>
      onDisconnect({ input: [], logger, emit, broadcast, rooms, ...commons }),
    );
  });
  return io.attach(target);
};
