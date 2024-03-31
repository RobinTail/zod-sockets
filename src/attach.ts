import http from "node:http";
import type { Server } from "socket.io";
import { AbstractAction } from "./action";
import { Client } from "./client";
import { Config } from "./config";
import { makeDistribution } from "./distribution";
import { EmitterConfig, makeEmitter, makeRoomService } from "./emission";
import { ClientContext, IndependentContext } from "./handler";
import { Namespaces, normalizeNS } from "./namespace";
import { getRemoteClients } from "./remote-client";
import { getStartupLogo } from "./startup-logo";

export const attachSockets = async <NS extends Namespaces>({
  io,
  actions,
  target,
  config: { logger: rootLogger, namespaces, timeout, startupLogo = true },
}: {
  /**
   * @desc The Socket.IO server
   * @example new Server()
   * */
  io: Server;
  /**
   * @desc The array of handling rules for the incoming Socket.IO events
   * @example [ onPing ]
   * */
  actions: AbstractAction[];
  /**
   * @desc HTTP or HTTPS server to attach the sockets to
   * @example http.createServer().listen(8090)
   * */
  target: http.Server;
  /** @desc The configuration describing the emission (outgoing events) */
  config: Config<NS>;
}): Promise<Server> => {
  for (const name in namespaces) {
    type NSEmissions = NS[typeof name]["emission"];
    type NSMeta = NS[typeof name]["metadata"];
    const ns = io.of(normalizeNS(name));
    const { emission, hooks, metadata } = namespaces[name];
    const {
      onConnection = ({ client: { id, getData }, logger }) =>
        logger.debug("Client connected", { ...getData(), id }),
      onDisconnect = ({ client: { id, getData }, logger }) =>
        logger.debug("Client disconnected", { ...getData(), id }),
      onAnyIncoming = ({ event, client: { id, getData }, logger }) =>
        logger.debug(`${event} from ${id}`, getData()),
      onAnyOutgoing = ({ event, logger, payload }) =>
        logger.debug(`Sending ${event}`, payload),
      onStartup = ({ logger }) => logger.debug("Ready"),
    } = hooks;
    const emitCfg: EmitterConfig<NSEmissions> = { emission, timeout };
    const nsCtx: IndependentContext<NSEmissions, NSMeta> = {
      logger: rootLogger,
      withRooms: makeRoomService({ subject: io, metadata, ...emitCfg }),
      all: {
        getClients: async () =>
          getRemoteClients({
            sockets: await ns.fetchSockets(),
            metadata,
            ...emitCfg,
          }),
        getRooms: () => Array.from(ns.adapter.rooms.keys()),
        broadcast: makeEmitter({ subject: io, ...emitCfg }),
      },
    };
    ns.on("connection", async (socket) => {
      const emit = makeEmitter({ subject: socket, ...emitCfg });
      const broadcast = makeEmitter({ subject: socket.broadcast, ...emitCfg });
      const client: Client<NSEmissions, NSMeta> = {
        emit,
        broadcast,
        id: socket.id,
        isConnected: () => socket.connected,
        getRooms: () => Array.from(socket.rooms),
        getData: () => socket.data || {},
        setData: (value) => {
          metadata.parse(value); // validation only, no transformations
          socket.data = value;
        },
        ...makeDistribution(socket),
      };
      const ctx: ClientContext<NSEmissions, NSMeta> = {
        ...nsCtx,
        client,
        withRooms: makeRoomService({ subject: socket, metadata, ...emitCfg }),
      };
      await onConnection(ctx);
      socket.onAny((event, ...payload) =>
        onAnyIncoming({ event, payload, ...ctx }),
      );
      socket.onAnyOutgoing((event, ...payload) =>
        onAnyOutgoing({ event, payload, ...ctx }),
      );
      for (const action of actions) {
        if (action.getNamespace() === name) {
          const event = action.getEvent();
          socket.on(event, async (...params) =>
            action.execute({ event, params, ...ctx }),
          );
        }
      }
      socket.on("disconnect", () => onDisconnect(ctx));
    });
    await onStartup(nsCtx);
  }
  (startupLogo ? console.log : () => {})(getStartupLogo());
  rootLogger.info("Listening", target.address());
  return io.attach(target);
};
