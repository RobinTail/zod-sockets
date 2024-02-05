import { Server } from "socket.io";
import { z } from "zod";

interface ValidEvent {
  schema: z.AnyZodTuple;
  ack?: z.AnyZodTuple;
}

interface ValidEventsMap {
  [name: string]: ValidEvent;
}

type WithAck<A extends z.AnyZodTuple, B extends z.AnyZodTuple> = (
  ...params: [...z.output<A>, (...params: z.output<B>) => void]
) => void;

type WithoutAck<A extends z.AnyZodTuple> = (...params: z.output<A>) => void;

type ToFunction<T extends ValidEvent> = T["ack"] extends z.AnyZodTuple
  ? WithAck<T["schema"], T["ack"]>
  : WithoutAck<T["schema"]>;

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
    second: { schema: z.tuple([z.date()]) },
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
  socket.emit("second", new Date());
});
test.emit("second", new Date()); // only events without ack
