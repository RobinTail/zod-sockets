import { z } from "zod/v4";
import { Client } from "./client";
import { RoomService } from "./emission";
import { RemoteClient } from "./remote-client";
import {
  AbstractLogger,
  ClientContext,
  EmissionMap,
  LoggerOverrides,
  Namespace,
} from "./index";
import * as entrypoint from "./index";

describe("Entrypoint", () => {
  test("should expose certain entities", () => {
    expect(entrypoint).toMatchSnapshot();
  });

  test("should expose certain types and interfaces", () => {
    expectTypeOf(console).toExtend<AbstractLogger>();
    expectTypeOf({}).toExtend<EmissionMap>();
    expectTypeOf({
      event: { schema: z.tuple([]) },
    }).toExtend<EmissionMap>();
    expectTypeOf({
      event: { schema: z.tuple([]), ack: z.tuple([]) },
    }).toExtend<EmissionMap>();
    expectTypeOf({
      event: { schema: z.object({}) },
    }).not.toExtend<EmissionMap>();
    expectTypeOf({}).toEqualTypeOf<LoggerOverrides>();
    expectTypeOf(null).not.toExtend<LoggerOverrides>();
    expectTypeOf({
      emission: { event: { schema: z.tuple([]) } },
      hooks: {},
      examples: {},
      security: [],
      metadata: z.object({ count: z.number() }),
    }).toExtend<
      Namespace<
        { event: { schema: z.ZodTuple<[]> } },
        z.ZodObject<{ count: z.ZodNumber }>
      >
    >();

    type SampleEmission = { event: { schema: z.ZodTuple<[]> } };
    type SampleData = z.ZodObject<{ count: z.ZodNumber }>;
    expectTypeOf<{
      client: Client<SampleEmission, SampleData>;
      all: {
        getRooms: () => string[];
        getClients: () => Promise<RemoteClient<SampleEmission, SampleData>[]>;
        broadcast: () => Promise<any>; // @todo revisit
      };
      logger: Console;
      withRooms: RoomService<SampleEmission, SampleData>;
    }>().toExtend<ClientContext<SampleEmission, SampleData>>();
  });
});
