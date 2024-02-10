import http from "node:http";
import type { Server } from "socket.io";
import { ActionMap } from "./action";
import { Client } from "./client";
import { Config } from "./config";
import {
  EmissionMap,
  makeBroadcaster,
  makeEmitter,
  makeRoomService,
} from "./emission";
import { ActionContext, ClientContext, Handler } from "./handler";
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
  onConnection?: Handler<ClientContext<E>, void>;
  onDisconnect?: Handler<ClientContext<E>, void>;
  onAnyEvent?: Handler<ActionContext<[string], E>, void>;
}): Server => {
  config.logger.info("ZOD-SOCKETS", target.address());
  const rootNS = io.of("/");
  const getAllRooms = () => Array.from(rootNS.adapter.rooms.keys());
  const getAllClients = async () =>
    getRemoteClients(await rootNS.fetchSockets());
  io.on("connection", async (socket) => {
    const emit = makeEmitter({ socket, config });
    const broadcast = makeBroadcaster({ socket, config });
    const client: Client<E> = {
      emit,
      broadcast,
      id: socket.id,
      isConnected: () => socket.connected,
      getRooms: () => Array.from(socket.rooms),
      getData: () => socket.data || {},
      setData: (value) => (socket.data = value),
      join: (rooms) => socket.join(rooms),
      leave: (rooms) =>
        typeof rooms === "string"
          ? socket.leave(rooms)
          : Promise.all(rooms.map((room) => socket.leave(room))).then(() => {}),
    };
    const withRooms = makeRoomService({ socket, config });
    const ctx: ClientContext<E> = {
      client,
      getAllClients,
      getAllRooms,
      logger: config.logger,
      withRooms,
    };
    await onConnection(ctx);
    socket.onAny((event) => onAnyEvent({ input: [event], ...ctx }));
    for (const [event, action] of Object.entries(actions)) {
      socket.on(event, async (...params) =>
        action.execute({ event, params, ...ctx }),
      );
    }
    socket.on("disconnect", () => onDisconnect(ctx));
  });
  return io.attach(target);
};
