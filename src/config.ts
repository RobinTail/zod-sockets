import { EmissionMap } from "./emission";
import { AbstractLogger } from "./logger";
import { Namespace, Namespaces, RootNS, rootNS } from "./namespaces";

interface ConstructorOptions<NS extends Namespaces<Namespace<EmissionMap>>> {
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
   * @see Namespace
   * */
  namespaces?: NS;
}

export class Config<T extends Namespaces<Namespace<EmissionMap>> = {}> {
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
  }: Partial<Namespace<E>> & { path?: K }): Config<
    T & Record<K, Namespace<E>>
  > {
    const { logger, timeout, startupLogo, namespaces } = this;
    return new Config({
      logger,
      timeout,
      startupLogo,
      namespaces: { ...namespaces, [path]: { emission, hooks } },
    });
  }
}

export const createConfig = <T extends Namespaces<Namespace<EmissionMap>>>(
  def: ConstructorOptions<T>,
) => new Config(def);
