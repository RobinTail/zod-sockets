import { EmissionMap } from "./emission";
import { AbstractLogger } from "./logger";

export interface Config<E extends EmissionMap> {
  logger: AbstractLogger;
  timeout: number;
  emission: E;
}

export const createConfig = <E extends EmissionMap>(config: Config<E>) =>
  config;
