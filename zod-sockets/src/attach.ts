import http from "node:http";
import type { Server } from "socket.io";
import { AbstractAction } from "./action";
import type { Client } from "./client";
import { ensureError } from "./common-helpers";
import { Config } from "./config";
import { makeDistribution } from "./distribution";
import { type EmitterConfig, makeEmitter, makeRoomService } from "./emission";
import type { ClientContext, IndependentContext } from "./handler";
import { defaultHooks } from "./hooks";
import type { AbstractLogger } from "./logger";
import { type Namespaces, normalizeNS } from "./namespace";
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
}) => {
  type NSEmissions<K extends keyof NS> = NS[K]["emission"];
  type NSMeta<K extends keyof NS> = NS[K]["metadata"];
  const contexts = {} as {
    [K in keyof NS]: IndependentContext<NSEmissions<K>, NSMeta<K>>;
  };
  for (const name in namespaces) {
    type Name = typeof name;
    const ns = io.of(normalizeNS(name));
    const { emission, hooks, metadata } = namespaces[name];
    const {
      onConnection,
      onDisconnect,
      onAnyIncoming,
      onAnyOutgoing,
      onStartup,
      onError,
    } = { ...defaultHooks, ...hooks };
    const emitCfg: EmitterConfig<NSEmissions<Name>> = { emission, timeout };
    const nsCtx: IndependentContext<NSEmissions<Name>, NSMeta<Name>> = {
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
    contexts[name] = nsCtx;
    ns.on("connection", async (socket) => {
      const emit = makeEmitter({ subject: socket, ...emitCfg });
      const broadcast = makeEmitter({ subject: socket.broadcast, ...emitCfg });
      const client: Client<NSEmissions<Name>, NSMeta<Name>> = {
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
      const ctx: ClientContext<NSEmissions<Name>, NSMeta<Name>> = {
        ...nsCtx,
        client,
        withRooms: makeRoomService({ subject: ns, metadata, ...emitCfg }),
      };
      await onConnection(ctx);
      socket.onAny((event, ...payload) =>
        onAnyIncoming({ event, payload, ...ctx }),
      );
      socket.onAnyOutgoing((event, ...payload) =>
        onAnyOutgoing({ event, payload, ...ctx }),
      );
      for (const action of actions) {
        if (action.namespace === name) {
          const { event } = action;
          socket.on(event, async (...params) => {
            try {
              return await action.execute({ params, ...ctx }); // await required
            } catch (error) {
              return onError({
                ...ctx,
                event,
                payload: params,
                error: ensureError(error),
              });
            }
          });
        }
      }
      socket.on("disconnect", (reason) => onDisconnect({ ...ctx, reason }));
    });
    await onStartup(nsCtx);
  }
  (startupLogo ? console.log : () => {})(getStartupLogo());
  rootLogger.debug("Running", process.env.TSDOWN_BUILD || "from sources");
  rootLogger.info("Listening", target.address());
  io.attach(target);
  return contexts;
};
