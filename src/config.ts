import { z } from "zod";
import { SecuritySchemeObject } from "./async-api/security";
import { EmissionMap } from "./emission";
import { Namespace, Namespaces, RootNS, rootNS } from "./namespace";

interface ConstructorOptions<NS extends Namespaces> {
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
  security?: SecuritySchemeObject[];
}

/** @todo consider using it for namespaces declaration only */
export class Config<T extends Namespaces = {}> {
  public readonly timeout: number;
  public readonly startupLogo: boolean;
  public readonly security: SecuritySchemeObject[];
  public readonly namespaces: T;

  public constructor({
    timeout = 2000,
    startupLogo = true,
    namespaces = {} as T,
    security = [],
  }: ConstructorOptions<T> = {}) {
    this.timeout = timeout;
    this.startupLogo = startupLogo;
    this.namespaces = namespaces;
    this.security = security;
  }

  /** @default { path: "/", emission: {}, metadata: z.object({}), hooks: {}, examples: {} } */
  public addNamespace<
    E extends EmissionMap = {},
    D extends z.SomeZodObject = z.ZodObject<{}>,
    K extends string = RootNS,
  >({
    path = rootNS as K,
    emission = {} as E,
    metadata = z.object({}) as D,
    hooks = {},
    examples = {},
    security,
  }: Partial<Namespace<E, D>> & { path?: K }): Config<
    Omit<T, K> & Record<K, Namespace<E, D>>
  > {
    const { namespaces, ...rest } = this;
    const ns: Namespace<E, D> = {
      emission,
      examples,
      hooks,
      metadata,
      security,
    };
    return new Config({ ...rest, namespaces: { ...namespaces, [path]: ns } });
  }
}

/** @desc Shorthand for single namespace config (root namespace only) */
export const createSimpleConfig = <
  E extends EmissionMap,
  D extends z.SomeZodObject,
>({
  startupLogo,
  timeout,
  security,
  emission,
  examples,
  hooks,
  metadata,
}: Omit<ConstructorOptions<never>, "namespaces"> &
  Partial<Namespace<E, D>> = {}) =>
  new Config({ startupLogo, timeout, security }).addNamespace({
    emission,
    examples,
    metadata,
    hooks,
  });
