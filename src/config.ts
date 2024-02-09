import { EmissionMap } from "./emission";
import { AbstractLogger } from "./logger";
import { Metadata } from "./metadata";

export interface Config<E extends EmissionMap, D extends Metadata> {
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
   * @desc The schema of the client's metadata
   * @example z.object({ username: z.string() })
   * @default z.object({}).passthrough()
   * */
  metadata?: D;
}

export const createConfig = <E extends EmissionMap, D extends Metadata>(
  config: Config<E, D>,
) => config;
