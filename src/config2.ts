import { AbstractAction, Action } from "./action";
import { ActionNoAckDef, ActionWithAckDef } from "./actions-factory";
import { EmissionMap } from "./emission";
import { HookSet } from "./hooks";
import { AbstractLogger } from "./logger";
import { RootNS, rootNS } from "./namespaces";

interface ConstructorOptions<
  NSE extends Record<string, Namespace<EmissionMap>>,
> {
  logger: AbstractLogger;
  timeout: number;
  startupLogo: boolean;
  namespaces: NSE;
}

interface Namespace<E extends EmissionMap> {
  emission: E;
  hooks: HookSet<E>;
  actions: AbstractAction[];
}

/** @todo rename */
export class Config2<NSE extends Record<string, Namespace<EmissionMap>> = {}> {
  public readonly logger: AbstractLogger;
  public readonly timeout: number;
  public readonly startupLogo: boolean;
  public readonly namespaces: NSE;

  constructor({
    logger = console,
    timeout = 2000,
    startupLogo = true,
    namespaces = {} as NSE,
  }: Partial<ConstructorOptions<NSE>>) {
    this.logger = logger;
    this.timeout = timeout;
    this.startupLogo = startupLogo;
    this.namespaces = namespaces;
  }

  public addNamespace<E extends EmissionMap, K extends string = RootNS>({
    path = rootNS as K,
    emission = {} as E,
    hooks = {},
    actions = [],
  }: Partial<Namespace<E>> & { path: K }): Config2<
    NSE & Record<K, Namespace<E>>
  > {
    const { logger, timeout, startupLogo, namespaces } = this;
    return new Config2({
      logger,
      timeout,
      startupLogo,
      namespaces: { ...namespaces, [path]: { emission, hooks, actions } },
    });
  }

  public addAction(
    // @todo types
    def: ActionNoAckDef<any, any, any> | ActionWithAckDef<any, any, any, any>,
  ) {
    this.namespaces[def.ns].actions.push(new Action(def));
    return this;
  }
}
