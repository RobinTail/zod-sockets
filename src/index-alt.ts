import { Server, ServerOptions } from "socket.io";
import { z } from "zod";

interface ValidEventsMap {
  [name: string]: z.AnyZodTuple;
}

export class ZodSockets<
  I extends ValidEventsMap,
  O extends ValidEventsMap,
> extends Server<
  { [K in keyof I]: z.output<I[K]> },
  { [K in keyof O]: z.output<O[K]> }
> {
  constructor({
    options,
  }: {
    options?: Partial<ServerOptions>;
    actions: I;
    emission: O;
  }) {
    super(options);
  }
}
