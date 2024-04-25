import http from "node:http";
import type { Server } from "socket.io";
import { AbstractAction } from "./action";
import { Client } from "./client";
import { Config } from "./config";
import { makeDistribution } from "./distribution";
import { EmitterConfig, makeEmitter, makeRoomService } from "./emission";
import { ClientContext, IndependentContext } from "./handler";
import { defaultHooks } from "./hooks";
import { AbstractLogger } from "./logger";
import { Namespaces, normalizeNS } from "./namespace";
import { makeRemoteClients } from "./remote-client";
import { getStartupLogo } from "./startup-logo";

export const attachSockets = async <NS extends Namespaces>({
  io,
  actions,
  target,
  config: { namespaces, timeout, startupLogo = true },
  logger: rootLogger = console,
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
  /**
   * @desc The instance of a logger
   * @default console
   * */
  logger?: AbstractLogger;
}): Promise<Server> => {
  for (const name in namespaces) {
    type NSEmissions = NS[typeof name]["emission"];
    type NSMeta = NS[typeof name]["metadata"];
    const ns = io.of(normalizeNS(name));
    const { emission, hooks, metadata } = namespaces[name];
    const {
      onConnection,
      onDisconnect,
      onAnyIncoming,
      onAnyOutgoing,
      onStartup,
    } = { ...defaultHooks, ...hooks };
    const emitCfg: EmitterConfig<NSEmissions> = { emission, timeout };
    const nsCtx: IndependentContext<NSEmissions, NSMeta> = {
      logger: rootLogger,
      withRooms: makeRoomService({ subject: io, metadata, ...emitCfg }),
      all: {
        getClients: async () =>
          makeRemoteClients({
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
        handshake: socket.handshake,
        getRequest: <T extends http.IncomingMessage>() => socket.request as T,
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
  rootLogger.debug("Running", process.env.TSUP_BUILD || "from sources");
  rootLogger.info("Listening", target.address());
  return io.attach(target);
};
