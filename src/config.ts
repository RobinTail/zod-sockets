import { AbstractLogger } from "./logger";
import { SomeNamespaces } from "./namespace";

export interface Config<NS extends SomeNamespaces> {
  /**
   * @desc The instance of a logger
   * @example console
   * */
  logger: AbstractLogger;
  /** @desc The acknowledgment awaiting timeout */
  timeout: number;
  namespaces: NS;
  /**
   * @desc You can disable the startup logo.
   * @default true
   */
  startupLogo?: boolean;
}

export const createConfig = <NS extends SomeNamespaces>(config: Config<NS>) =>
  config;
