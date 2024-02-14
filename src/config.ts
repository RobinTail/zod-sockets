import { z } from "zod";
import { EmissionMap } from "./emission";
import { AbstractLogger } from "./logger";
import { SomeNamespaces } from "./namespace";

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
): Config<{ "/": E }>;
export function createConfig<NS extends SomeNamespaces<EmissionMap>>(
  config: Config<NS>,
): Config<NS>;
export function createConfig(
  config: Config<SomeNamespaces<EmissionMap> | EmissionMap>,
) {
  const emission: SomeNamespaces<EmissionMap> = { "/": {} };
  for (const [key, value] of Object.entries(config.emission)) {
    if ("schema" in value && value.schema instanceof z.ZodTuple) {
      emission["/"][key] = value;
    } else {
      emission[key] = value;
    }
  }
  return { ...config, ...emission };
}
