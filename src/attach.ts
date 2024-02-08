import http from "node:http";
import type { Server } from "socket.io";
import { ActionMap, Handler, HandlingFeatures, SocketFeatures } from "./action";
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
  config,
  onConnection = ({ socketId }) =>
    config.logger.debug("User connected", socketId),
  onDisconnect = ({ socketId }) =>
    config.logger.debug("User disconnected", socketId),
  onAnyEvent = ({ input: [event], socketId }) =>
    config.logger.debug(`${event} from ${socketId}`),
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
  config.logger.info("ZOD-SOCKETS", target.address());
  io.on("connection", async (socket) => {
    const emit = makeEmitter({ socket, config });
    const broadcast = makeBroadcaster({ socket, config });
    const rooms = makeRoomService({ socket, config });
    const commons: SocketFeatures & HandlingFeatures<E> = {
      socketId: socket.id,
      isConnected: () => socket.connected,
      logger: config.logger,
      emit,
      broadcast,
      rooms,
    };
    await onConnection({ input: [], ...commons });
    socket.onAny((event) => onAnyEvent({ input: [event], ...commons }));
    for (const [event, action] of Object.entries(actions)) {
      socket.on(event, async (...params) =>
        action.execute({ event, params, ...commons }),
      );
    }
    socket.on("disconnect", () => onDisconnect({ input: [], ...commons }));
  });
  return io.attach(target);
};
