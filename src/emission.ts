import type { Socket } from "socket.io";
import { z } from "zod";
import { AbstractLogger } from "./logger";

export interface Emission {
  schema: z.AnyZodTuple;
  ack?: z.AnyZodTuple;
}

export interface EmissionMap {
  [event: string]: Emission;
}

type TupleOrBool<T> = T extends z.AnyZodTuple ? T : z.ZodBoolean;

export type Emitter<E extends EmissionMap> = <K extends keyof E>(
  evt: K,
  ...args: z.input<E[K]["schema"]>
) => Promise<z.output<TupleOrBool<E[K]["ack"]>>>;

/** @throws z.ZodError */
export const makeEmitter =
  <E extends EmissionMap>({
    emission,
    logger,
    socket,
    timeout,
  }: {
    emission: E;
    logger: AbstractLogger;
    socket: Socket;
    timeout: number;
  }): Emitter<E> =>
  async (event, ...args) => {
    const { schema, ack: ackSchema } = emission[event];
    try {
      const payload = schema.parse(args);
      logger.debug(`Emitting ${String(event)}`, payload);
      if (!ackSchema) {
        return socket.emit(String(event), ...payload);
      }
      const ack = await socket
        .timeout(timeout)
        .emitWithAck(String(event), ...payload);
      return ackSchema.parse(ack);
    } catch (error) {
      logger.error(`Failed to emit ${String(event)}`, error);
      return false;
    }
  };
