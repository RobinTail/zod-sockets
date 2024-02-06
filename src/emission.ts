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

type TupleOrTrue<T> = T extends z.AnyZodTuple ? T : z.ZodLiteral<true>;
type TuplesOrTrue<T> = T extends z.AnyZodTuple
  ? z.ZodArray<T>
  : z.ZodLiteral<true>;

export type Emitter<E extends EmissionMap> = <K extends keyof E>(
  evt: K,
  ...args: z.input<E[K]["schema"]>
) => Promise<z.output<TupleOrTrue<E[K]["ack"]>>>;

export type Broadcaster<E extends EmissionMap> = <K extends keyof E>(
  evt: K,
  ...args: z.input<E[K]["schema"]>
) => Promise<z.output<TuplesOrTrue<E[K]["ack"]>>>;

/**
 * @throws z.ZodError on validation
 * @throws Error on ack timeout
 * */
export const makeGenericEmitter =
  <T extends Socket | Socket["broadcast"], E extends EmissionMap>({
    emission,
    logger,
    target,
    timeout,
  }: {
    emission: E;
    logger: AbstractLogger;
    target: T;
    timeout: number;
  }): T extends Socket ? Emitter<E> : Broadcaster<E> =>
  async (event, ...args) => {
    const isSocket = "id" in target;
    const { schema, ack } = emission[event];
    const payload = schema.parse(args);
    logger.debug(
      `${isSocket ? "Emitting" : "Broadcasting"} ${String(event)}`,
      payload,
    );
    if (!ack) {
      return target.emit(String(event), ...payload) || true;
    }
    const response = await target
      .timeout(timeout)
      .emitWithAck(String(event), ...payload);
    return (isSocket ? ack : ack.array()).parse(response);
  };
