import type { Socket } from "socket.io";
import { z } from "zod";
import { EmissionMap } from "./emission";
import { AbstractLogger } from "./logger";

type TuplesOrBool<T> = T extends z.AnyZodTuple ? z.ZodArray<T> : z.ZodBoolean;

export type Broadcaster<E extends EmissionMap> = <K extends keyof E>(
  evt: K,
  ...args: z.input<E[K]["schema"]>
) => Promise<z.output<TuplesOrBool<E[K]["ack"]>>>;

export const makeBroadcaster =
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
  }): Broadcaster<E> =>
  async (event, ...args) => {
    const { schema, ack: ackSchema } = emission[event];
    try {
      const payload = schema.parse(args);
      logger.debug(`Broadcasting ${String(event)}`, payload);
      if (!ackSchema) {
        return socket.broadcast.emit(String(event), ...payload);
      }
      const ack = await socket.broadcast
        .timeout(timeout)
        .emitWithAck(String(event), ...payload);
      return ackSchema.array().parse(ack);
    } catch (error) {
      logger.error(`Failed to broadcast ${String(event)}`, error);
      return false;
    }
  };
