import { z } from "zod/v4";
import { SecuritySchemeObject } from "./async-api/security";
import { EmptyObject } from "./common-helpers";
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
export class Config<T extends Namespaces = EmptyObject> {
  /** @internal */
  public readonly timeout: number;
  /** @internal */
  public readonly startupLogo: boolean;
  /** @internal */
  public readonly security: SecuritySchemeObject[];
  /** @internal */
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

  /** @default { path: "/", emission: {}, metadata: z.object({}), hooks: {}, examples: {}, security: [] } */
  public addNamespace<
    E extends EmissionMap = EmptyObject,
    D extends z.ZodObject = z.ZodObject<EmptyObject>,
    K extends string = RootNS,
  >({
    path = rootNS as K,
    emission = {} as E,
    metadata = z.object({}) as D,
    hooks = {},
    security = [],
  }: Partial<Namespace<E, D>> & { path?: K }): Config<
    Omit<T, K> & Record<K, Namespace<E, D>>
  > {
    const { namespaces, ...rest } = this;
    const ns: Namespace<E, D> = { emission, hooks, metadata, security };
    return new Config({ ...rest, namespaces: { ...namespaces, [path]: ns } });
  }
}

/** @desc Shorthand for single namespace config (root namespace only) */
export const createSimpleConfig = <
  E extends EmissionMap,
  D extends z.ZodObject,
>({
  startupLogo,
  timeout,
  security,
  emission,
  hooks,
  metadata,
}: Omit<ConstructorOptions<never>, "namespaces"> &
  Partial<Namespace<E, D>> = {}) =>
  new Config({ startupLogo, timeout, security }).addNamespace({
    emission,
    metadata,
    hooks,
  });
