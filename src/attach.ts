import http from "node:http";
import type { Server } from "socket.io";
import { AbstractAction } from "./action";
import { Client } from "./client";
import { Config } from "./config";
import { makeDistribution } from "./distribution";
import {
  EmissionMap,
  EmitterConfig,
  makeEmitter,
  makeRoomService,
} from "./emission";
import {
  ClientContext,
  Handler,
  IndependentContext,
  TracingContext,
} from "./handler";
import { SomeNamespaces, ensureNamespaces, normalizeNS } from "./namespace";
import { getRemoteClients } from "./remote-client";
import { getStartupLogo } from "./startup-logo";

interface HookSet<E extends EmissionMap> {
  /** @desc A place for emitting events regardless receiving events */
  onConnection?: Handler<ClientContext<E>, void>;
  onDisconnect?: Handler<ClientContext<E>, void>;
  onAnyIncoming?: Handler<TracingContext<E>, void>;
  onAnyOutgoing?: Handler<TracingContext<E>, void>;
  /** @desc A place for emitting events regardless clients activity */
  onStartup?: Handler<IndependentContext<E>, void>;
}

type Hooks<NS extends SomeNamespaces<EmissionMap>> = {
  [K in keyof NS]?: HookSet<NS[K]>;
};

export const attachSockets = async <NS extends SomeNamespaces<EmissionMap>>({
  io,
  actions,
  target,
  config: {
    logger: rootLogger,
    emission: namespaces,
    timeout,
    startupLogo = true,
  },
  hooks: hooksCfg,
}: {
  /**
   * @desc The Socket.IO server
   * @example new Server()
   * */
  io: Server;
  /**
   * @desc the object declares handling rules of the incoming socket.io events
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
  hooks?: Hooks<NS> | HookSet<NS["/"]>;
}): Promise<Server> => {
  const hooks = ensureNamespaces(
    hooksCfg || {},
    (value) => typeof value === "function",
  ) as Hooks<NS>;

  for (const name in namespaces) {
    type E = NS[typeof name];
    const ns = io.of(normalizeNS(name));
    const emission = namespaces[name];
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
    } = (hooks?.[name] || {}) as HookSet<E>;
    const emitCfg: EmitterConfig<E> = { emission, timeout };
    const nsCtx: IndependentContext<E> = {
      logger: rootLogger,
      withRooms: makeRoomService({ subject: io, ...emitCfg }),
      all: {
        getClients: async () => getRemoteClients(await ns.fetchSockets()),
        getRooms: () => Array.from(ns.adapter.rooms.keys()),
        broadcast: makeEmitter({ subject: io, ...emitCfg }),
      },
    };
    ns.on("connection", async (socket) => {
      const emit = makeEmitter({ subject: socket, ...emitCfg });
      const broadcast = makeEmitter({ subject: socket.broadcast, ...emitCfg });
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
        ...nsCtx,
        client,
        withRooms: makeRoomService({ subject: socket, ...emitCfg }),
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
