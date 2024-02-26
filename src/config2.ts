import { Action } from "./action";
import { EmissionMap } from "./emission";
import { HookSet } from "./hooks";
import { AbstractLogger } from "./logger";
import { rootNS } from "./namespaces";

interface ConstructorOptions {
  logger: AbstractLogger;
  timeout: number;
  startupLogo: boolean;
}

interface Namespace<E extends EmissionMap> {
  path: string;
  emission: E;
  hooks: HookSet<E>;
  actions: Action<any, any>[]; // @todo refactor or reconsider
}

/** @todo rename */
export class Config2 {
  public readonly logger: AbstractLogger;
  public readonly timeout: number;
  public readonly startupLogo: boolean;
  public readonly namespaces: Record<string, Namespace<EmissionMap>> = {};

  constructor({
    logger = console,
    timeout = 2000,
    startupLogo = true,
  }: Partial<ConstructorOptions>) {
    this.logger = logger;
    this.timeout = timeout;
    this.startupLogo = startupLogo;
  }

  public addNamespace<E extends EmissionMap>({
    path = rootNS,
    emission = {} as E,
    hooks = {},
    actions = [],
  }: Partial<Namespace<E>>) {
    this.namespaces[path] = { path, emission, hooks, actions };
    return this;
  }
}
