import http from "node:http";
import type { Server } from "socket.io";
import { ActionMap } from "./action";
import { Config } from "./config";
import {
  EmissionMap,
  makeBroadcaster,
  makeEmitter,
  makeRoomService,
} from "./emission";
import { Handler, HandlingFeatures } from "./handler";
import { getRemoteClients } from "./remote-client";

export const attachSockets = <E extends EmissionMap>({
  io,
  actions,
  target,
  config,
  onConnection = ({ client: { id, getData } }) =>
    config.logger.debug("Client connected", { ...getData(), id }),
  onDisconnect = ({ client: { id, getData } }) =>
    config.logger.debug("Client disconnected", { ...getData(), id }),
  onAnyEvent = ({ input: [event], client: { id, getData } }) =>
    config.logger.debug(`${event} from ${id}`, getData()),
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
  config: Config<E>;
  /** @desc A place for emitting events unrelated to the incoming events */
  onConnection?: Handler<[], void, E>;
  onDisconnect?: Handler<[], void, E>;
  onAnyEvent?: Handler<[string], void, E>;
}): Server => {
  config.logger.info("ZOD-SOCKETS", target.address());
  const rootNS = io.of("/");
  const getAllRooms = () => Array.from(rootNS.adapter.rooms.keys());
  const getAllClients = async () =>
    getRemoteClients(await rootNS.fetchSockets());
  io.on("connection", async (socket) => {
    const emit = makeEmitter({ socket, config });
    const broadcast = makeBroadcaster({ socket, config });
    const withRooms = makeRoomService({ socket, config });
    const commons: HandlingFeatures<E> = {
      client: {
        emit,
        broadcast,
        id: socket.id,
        isConnected: () => socket.connected,
        getRooms: () => Array.from(socket.rooms),
        getData: () => socket.data || {},
        setData: (value) => (socket.data = value),
      },
      getAllClients,
      getAllRooms,
      logger: config.logger,
      withRooms,
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
