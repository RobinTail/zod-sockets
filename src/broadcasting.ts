import type { Socket } from "socket.io";
import { z } from "zod";
import { EmissionMap } from "./emission";
import { AbstractLogger } from "./logger";

type TuplesOrTrue<T> = T extends z.AnyZodTuple
  ? z.ZodArray<T>
  : z.ZodLiteral<true>;

export type Broadcaster<E extends EmissionMap> = <K extends keyof E>(
  evt: K,
  ...args: z.input<E[K]["schema"]>
) => Promise<z.output<TuplesOrTrue<E[K]["ack"]>>>;

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
    const broadcastValidation = schema.safeParse(args);
    if (!broadcastValidation.success) {
      return logger.error(
        `${String(event)} broadcase validation error`,
        broadcastValidation.error,
      );
    }
    logger.debug(`Broadcasting ${String(event)}`, broadcastValidation.data);
    if (!ackSchema) {
      return (
        socket.broadcast.emit(String(event), ...broadcastValidation.data) ||
        true
      );
    }
    const ack = await socket.broadcast
      .timeout(timeout)
      .emitWithAck(String(event), ...broadcastValidation.data);
    return ackSchema.array().parse(ack);
  };
