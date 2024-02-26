import { EmissionMap } from "./emission";
import { HookSet } from "./hooks";
import { AbstractLogger } from "./logger";
import { Namespaces, RootNS, rootNS } from "./namespaces";

interface ConstructorOptions<NSE extends Namespaces<Namespace<EmissionMap>>> {
  /**
   * @desc The instance of a logger
   * @default console
   * */
  logger?: AbstractLogger;
  /**
   * @desc The acknowledgment awaiting timeout
   * @default 2000
   * */
  timeout?: number;
  /**
   * @desc You can disable the startup logo.
   * @default true
   */
  startupLogo?: boolean;
  /**
   * @desc Define namespaces inline or consider using addNamespace() method
   * @default {}
   * */
  namespaces?: NSE;
}

// @todo the place for metadata
interface Namespace<E extends EmissionMap> {
  /**
   * @desc The events that the server can emit
   * @default {}
   * */
  emission: E;
  /**
   * @desc Handlers for some events in different contexts
   * @default {}
   * */
  hooks: HookSet<E>;
}

/** @todo rename */
export class Config2<T extends Namespaces<Namespace<EmissionMap>> = {}> {
  public readonly logger: AbstractLogger;
  public readonly timeout: number;
  public readonly startupLogo: boolean;
  public readonly namespaces: T;

  public constructor({
    logger = console,
    timeout = 2000,
    startupLogo = true,
    namespaces = {} as T,
  }: ConstructorOptions<T>) {
    this.logger = logger;
    this.timeout = timeout;
    this.startupLogo = startupLogo;
    this.namespaces = namespaces;
  }

  public addNamespace<E extends EmissionMap, K extends string = RootNS>({
    path = rootNS as K,
    emission = {} as E,
    hooks = {},
  }: Partial<Namespace<E>> & { path?: K }): Config2<
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

export const createConfig = <T extends Namespaces<Namespace<EmissionMap>>>(
  def: T,
) => new Config2(def);
