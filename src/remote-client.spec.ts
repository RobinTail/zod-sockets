import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { SomeRemoteSocket, makeRemoteClients } from "./remote-client";

describe("RemoteClient", () => {
  describe("makeRemoteClients()", () => {
    const socketsMock = [
      {
        id: "ONE",
        rooms: new Set(["room1"]),
        data: { name: "TEST" },
        join: vi.fn(),
        leave: vi.fn(),
        emit: vi.fn(),
      },
      {
        id: "TWO",
        rooms: new Set(["room2"]),
        join: vi.fn(),
        leave: vi.fn(),
        emit: vi.fn(),
      },
    ];

    test("should map RemoteSockets to RemoteClients", () => {
      const clients = makeRemoteClients({
        sockets: socketsMock as unknown as SomeRemoteSocket[],
        metadata: z.object({ name: z.string() }),
        emission: { test: { schema: z.tuple([z.string()]) } },
        timeout: 2000,
      });
      expect(clients).toEqual([
        {
          id: "ONE",
          rooms: ["room1"],
          getData: expect.any(Function),
          join: expect.any(Function),
          leave: expect.any(Function),
          emit: expect.any(Function),
        },
        {
          id: "TWO",
          rooms: ["room2"],
          getData: expect.any(Function),
          join: expect.any(Function),
          leave: expect.any(Function),
          emit: expect.any(Function),
        },
      ]);

      // getData:
      expect(clients[0].getData()).toEqual({ name: "TEST" });
      expect(clients[1].getData()).toEqual({});

      // emit
      clients[0].emit("test", "something");
      expect(socketsMock[0].emit).toHaveBeenLastCalledWith("test", "something");
    });
  });
});
