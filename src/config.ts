import { z } from "zod";
import { EmissionMap, isEmission } from "./emission";
import { AbstractLogger } from "./logger";
import { Namespaces, RootNS, ensureNamespaces } from "./namespaces";

export interface Config<
  T extends Namespaces<EmissionMap> | EmissionMap,
  D extends z.SomeZodObject,
> {
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
   * @desc Client metadata
   * @example z.object({})
   * */
  metadata: D;
  /**
   * @desc You can disable the startup logo.
   * @default true
   */
  startupLogo?: boolean;
}

export function createConfig<E extends EmissionMap, D extends z.SomeZodObject>(
  config: Config<E, D>,
): Config<Record<RootNS, E>, D>;
export function createConfig<
  NS extends Namespaces<EmissionMap>,
  D extends z.SomeZodObject,
>(config: Config<NS, D>): Config<NS, D>;
export function createConfig({
  emission,
  ...rest
}: Config<Namespaces<EmissionMap> | EmissionMap, z.SomeZodObject>) {
  return { ...rest, emission: ensureNamespaces(emission, isEmission) };
}
