import { Server } from "socket.io";
import { z } from "zod";

interface ValidEvent {
  schema: z.AnyZodTuple;
  ack: z.AnyZodTuple;
}

interface ValidEventsMap {
  [name: string]: ValidEvent;
}

type ToFunction<T extends ValidEvent> = (
  ...params: [...z.output<T["schema"]>, (...params: z.output<T["ack"]>) => void]
) => void;

const wrap = <
  I extends ValidEventsMap,
  O extends ValidEventsMap,
  S extends ValidEventsMap,
>({
  server,
}: {
  server: Server;
  actions: I;
  emission: O;
  internal: S;
}): Server<
  { [K in keyof I]: ToFunction<I[K]> },
  { [K in keyof O]: ToFunction<O[K]> },
  { [K in keyof S]: ToFunction<S[K]> }
> => {
  return server;
};

const test = wrap({
  server: new Server(),
  actions: {
    example: { schema: z.tuple([z.number()]), ack: z.tuple([z.string()]) },
  },
  emission: {
    second: { schema: z.tuple([z.date()]), ack: z.tuple([z.boolean()]) },
  },
  internal: {
    side: { schema: z.tuple([z.literal("test")]), ack: z.tuple([z.number()]) },
  },
});

test.on("side", (a, b) => {
  b(1);
});
test.on("connect", (socket) => {
  socket.on("example", (a, b) => {
    b("");
  });
  socket.emit("second", new Date(), (a) => {});
});
test.emit("second"); // only events without ack
