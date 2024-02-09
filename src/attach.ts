import http from "node:http";
import type { Server } from "socket.io";
import { ActionMap, Handler, HandlingFeatures } from "./action";
import { Config } from "./config";
import {
  EmissionMap,
  makeBroadcaster,
  makeEmitter,
  makeRoomService,
} from "./emission";
import { Metadata, defaultMeta } from "./metadata";
import { getRemoteClients } from "./remote-client";

export const attachSockets = <E extends EmissionMap, D extends Metadata>({
  io,
  actions,
  target,
  config,
  onConnection = ({ client }) =>
    config.logger.debug("Client connected", client.id),
  onDisconnect = ({ client }) =>
    config.logger.debug("Client disconnected", client.id),
  onAnyEvent = ({ input: [event], client }) =>
    config.logger.debug(`${event} from ${client.id}`),
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
  config: Config<E, D>;
  /** @desc A place for emitting events unrelated to the incoming events */
  onConnection?: Handler<[], void, E, D>;
  onDisconnect?: Handler<[], void, E, D>;
  onAnyEvent?: Handler<[string], void, E, D>;
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
    const commons: HandlingFeatures<E, D> = {
      client: {
        emit,
        id: socket.id,
        isConnected: () => socket.connected,
        getRooms: () => Array.from(socket.rooms),
        getData: () => socket.data,
        setData: (next) =>
          (socket.data = (config.metadata || defaultMeta).parse(next)),
      },
      all: {
        broadcast,
        getClients: getAllClients,
        getRooms: getAllRooms,
      },
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
