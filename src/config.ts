import { EmissionMap } from "./emission";
import { AbstractLogger } from "./logger";

export interface SocketsConfig<E extends EmissionMap> {
  logger: AbstractLogger;
  timeout: number;
  emission: E;
}

export const createConfig = <E extends EmissionMap>(config: SocketsConfig<E>) =>
  config;
