import { z } from "zod";
import { EmissionMap } from "./emission";
import { AbstractLogger } from "./logger";
import { Namespace, Namespaces, RootNS, rootNS } from "./namespace";

interface ConstructorOptions<NS extends Namespaces> {
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
   * @see Namespaces
   * */
  namespaces?: NS;
}

export class Config<T extends Namespaces = {}> {
  public readonly logger: AbstractLogger;
  public readonly timeout: number;
  public readonly startupLogo: boolean;
  public readonly namespaces: T;

  public constructor({
    logger = console,
    timeout = 2000,
    startupLogo = true,
    namespaces = {} as T,
  }: ConstructorOptions<T> = {}) {
    this.logger = logger;
    this.timeout = timeout;
    this.startupLogo = startupLogo;
    this.namespaces = namespaces;
  }

  public addNamespace<
    E extends EmissionMap = {},
    D extends z.SomeZodObject = z.ZodObject<{}>,
    K extends string = RootNS,
  >({
    path = rootNS as K,
    emission = {} as E,
    metadata = z.object({}) as D,
    hooks = {},
  }: Partial<Namespace<E, D>> & { path?: K }): Config<
    Omit<T, K> & Record<K, Namespace<E, D>>
  > {
    const { logger, timeout, startupLogo, namespaces } = this;
    return new Config({
      logger,
      timeout,
      startupLogo,
      namespaces: { ...namespaces, [path]: { emission, hooks, metadata } },
    });
  }
}

/** @desc Shorthand for single namespace config (root namespace only) */
export const createSimpleConfig = <
  E extends EmissionMap,
  D extends z.SomeZodObject,
>({
  startupLogo,
  timeout,
  logger,
  emission,
  hooks,
  metadata,
}: Omit<ConstructorOptions<never>, "namespaces"> &
  Partial<Namespace<E, D>> = {}) =>
  new Config({ startupLogo, timeout, logger }).addNamespace({
    emission,
    metadata,
    hooks,
  });
