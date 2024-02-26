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

// @todo place for metadata
interface Namespace<E extends EmissionMap> {
  emission: E;
  hooks: HookSet<E>;
}

/** @todo rename */
export class Config2<T extends Record<string, Namespace<EmissionMap>> = {}> {
  public readonly logger: AbstractLogger;
  public readonly timeout: number;
  public readonly startupLogo: boolean;
  public readonly namespaces: T;

  constructor({
    logger = console,
    timeout = 2000,
    startupLogo = true,
    namespaces = {} as T,
  }: Partial<ConstructorOptions<T>>) {
    this.logger = logger;
    this.timeout = timeout;
    this.startupLogo = startupLogo;
    this.namespaces = namespaces;
  }

  public addNamespace<E extends EmissionMap, K extends string = RootNS>({
    path = rootNS as K,
    emission = {} as E,
    hooks = {},
  }: Partial<Namespace<E>> & { path: K }): Config2<
    T & Record<K, Namespace<E>>
  > {
    const { logger, timeout, startupLogo, namespaces } = this;
    return new Config2({
      logger,
      timeout,
      startupLogo,
      namespaces: { ...namespaces, [path]: { emission, hooks } },
    });
  }
}
