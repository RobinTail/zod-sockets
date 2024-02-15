import { EmissionMap, isEmission } from "./emission";
import { AbstractLogger } from "./logger";
import { RootNS, SomeNamespaces, ensureNamespaces } from "./namespace";

export interface Config<T extends SomeNamespaces<EmissionMap> | EmissionMap> {
  /**
   * @desc The instance of a logger
   * @example console
   * */
  logger: AbstractLogger;
  /** @desc The acknowledgment awaiting timeout */
  timeout: number;
  /** @desc The events that the server can emit (optionally within namespaces) */
  emission: T;
  /**
   * @desc You can disable the startup logo.
   * @default true
   */
  startupLogo?: boolean;
}

export function createConfig<E extends EmissionMap>(
  config: Config<E>,
): Config<Record<RootNS, E>>;
export function createConfig<NS extends SomeNamespaces<EmissionMap>>(
  config: Config<NS>,
): Config<NS>;
export function createConfig({
  emission,
  ...rest
}: Config<SomeNamespaces<EmissionMap> | EmissionMap>) {
  return { ...rest, emission: ensureNamespaces(emission, isEmission) };
}
