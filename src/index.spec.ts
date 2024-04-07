import { expectNotType, expectType } from "tsd";
import { z } from "zod";
import {
  ClientContext,
  EmissionMap,
  LoggerOverrides,
  Namespace,
} from "./index";
import * as entrypoint from "./index";
import { describe, expect, test } from "vitest";

describe("Entrypoint", () => {
  test("should expose certain entities", () => {
    expect(entrypoint).toMatchSnapshot();
  });

  test("should expose certain types and interfaces", () => {
    expectType<EmissionMap>({});
    expectType<EmissionMap>({ event: { schema: z.tuple([]) } });
    expectType<EmissionMap>({
      event: { schema: z.tuple([]), ack: z.tuple([]) },
    });
    expectNotType<EmissionMap>({ event: { schema: z.object({}) } });
    expectType<LoggerOverrides>({});
    expectNotType<LoggerOverrides>(null);
    expectType<
      Namespace<
        { event: { schema: z.ZodTuple<[]> } },
        z.ZodObject<{ count: z.ZodNumber }>
      >
    >({
      emission: { event: { schema: z.tuple([]) } },
      hooks: {},
      examples: {},
      metadata: z.object({ count: z.number() }),
    });
    expectType<
      ClientContext<
        { event: { schema: z.ZodTuple<[]> } },
        z.ZodObject<{ count: z.ZodNumber }>
      >
    >({
      client: {
        isConnected: () => true,
        id: "",
        handshake: {
          headers: {},
          time: "",
          auth: {},
          url: "",
          address: "",
          issued: 0,
          secure: true,
          xdomain: false,
          query: {},
        },
        getData: () => ({ count: 1 }),
        setData: () => {},
        join: async () => {},
        leave: async () => {},
        getRooms: () => [""],
        emit: async () => true,
        broadcast: async () => true,
      },
      logger: console,
      all: {
        getRooms: () => [""],
        getClients: async () => [
          {
            id: "",
            handshake: {
              headers: {},
              time: "",
              auth: {},
              url: "",
              address: "",
              issued: 0,
              secure: false,
              xdomain: false,
              query: {},
            },
            rooms: [""],
            getData: () => ({ count: 1 }),
            emit: async () => true,
            join: async () => {},
            leave: async () => {},
          },
        ],
        broadcast: async () => true,
      },
      withRooms: () => ({
        broadcast: async () => true,
        getClients: async () => [],
      }),
    });
  });
});
