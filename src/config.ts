import { EmissionMap } from "./emission";
import { AbstractLogger } from "./logger";

export interface Config<E extends EmissionMap> {
  /**
   * @desc The instance of a logger
   * @example console
   * */
  logger: AbstractLogger;
  /** @desc The acknowledgment awaiting timeout */
  timeout: number;
  /** @desc The events that the server can emit */
  emission: E;
  /**
   * @desc You can disable the startup logo.
   * @default true
   */
  startupLogo?: boolean;
}

export const createConfig = <E extends EmissionMap>(config: Config<E>) =>
  config;
