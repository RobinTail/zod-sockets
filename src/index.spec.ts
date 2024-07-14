import { z } from "zod";
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
import { describe, expect, expectTypeOf, test } from "vitest";

describe("Entrypoint", () => {
  test("should expose certain entities", () => {
    expect(entrypoint).toMatchSnapshot();
  });

  test("should expose certain types and interfaces", () => {
    expectTypeOf(console).toMatchTypeOf<AbstractLogger>();
    expectTypeOf({}).toMatchTypeOf<EmissionMap>();
    expectTypeOf({
      event: { schema: z.tuple([]) },
    }).toMatchTypeOf<EmissionMap>();
    expectTypeOf({
      event: { schema: z.tuple([]), ack: z.tuple([]) },
    }).toMatchTypeOf<EmissionMap>();
    expectTypeOf({
      event: { schema: z.object({}) },
    }).not.toMatchTypeOf<EmissionMap>();
    expectTypeOf({}).toEqualTypeOf<LoggerOverrides>();
    expectTypeOf(null).not.toMatchTypeOf<LoggerOverrides>();
    expectTypeOf({
      emission: { event: { schema: z.tuple([]) } },
      hooks: {},
      examples: {},
      security: [],
      metadata: z.object({ count: z.number() }),
    }).toMatchTypeOf<
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
        broadcast: () => Promise<true>;
      };
      logger: Console;
      withRooms: RoomService<SampleEmission, SampleData>;
    }>().toMatchTypeOf<ClientContext<SampleEmission, SampleData>>();
  });
});
