import { EmissionMap } from "./emission";

export interface SocketsConfig<E extends EmissionMap> {
  timeout: number;
  emission: E;
}

export const createConfig = <E extends EmissionMap>(config: SocketsConfig<E>) =>
  config;
