import http from "node:http";
import type { Server } from "socket.io";
import { ActionMap } from "./action";
import { Client } from "./client";
import { Config } from "./config";
import { makeDistribution } from "./distribution";
import {
  Broadcaster,
  EmissionMap,
  Emitter,
  makeEmitter,
  makeRoomService,
} from "./emission";
import {
  ActionContext,
  ClientContext,
  Handler,
  IndependentContext,
} from "./handler";
import { getRemoteClients } from "./remote-client";
import { getStartupLogo } from "./startup-logo";

export const attachSockets = async <E extends EmissionMap>({
  io,
  actions,
  target,
  onConnection = ({ client: { id, getData }, logger }) =>
    logger.debug("Client connected", { ...getData(), id }),
  onDisconnect = ({ client: { id, getData }, logger }) =>
    logger.debug("Client disconnected", { ...getData(), id }),
  onAnyEvent = ({ input: [event], client: { id, getData }, logger }) =>
    logger.debug(`${event} from ${id}`, getData()),
  onStartup = ({ logger }) => logger.debug("Ready"),
  config: { logger, emission, timeout, startupLogo = true },
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
  onStartup?: Handler<IndependentContext<E>, void>;
}): Promise<Server> => {
  const rootNS = io.of("/");
  const rootCtx: IndependentContext<E> = {
    logger,
    withRooms: makeRoomService({ subject: io, logger, emission, timeout }),
    all: {
      getClients: async () => getRemoteClients(await rootNS.fetchSockets()),
      getRooms: () => Array.from(rootNS.adapter.rooms.keys()),
      broadcast: makeEmitter<Broadcaster<E>>({
        subject: io,
        logger,
        emission,
        timeout,
      }),
    },
  };
  io.on("connection", async (socket) => {
    const emit = makeEmitter<Emitter<E>>({
      subject: socket,
      logger,
      emission,
      timeout,
    });
    const broadcast = makeEmitter<Broadcaster<E>>({
      subject: socket.broadcast,
      logger,
      emission,
      timeout,
    });
    const client: Client<E> = {
      emit,
      broadcast,
      id: socket.id,
      isConnected: () => socket.connected,
      getRooms: () => Array.from(socket.rooms),
      getData: () => socket.data || {},
      setData: (value) => (socket.data = value),
      ...makeDistribution(socket),
    };
    const ctx: ClientContext<E> = {
      ...rootCtx,
      client,
      withRooms: makeRoomService({
        subject: socket,
        logger,
        emission,
        timeout,
      }),
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
  if (startupLogo) {
    console.log(getStartupLogo());
  }
  await onStartup(rootCtx);
  logger.info("Listening", target.address());
  return io.attach(target);
};
