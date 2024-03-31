import { RemoteSocket } from "socket.io";
import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { getRemoteClients } from "./remote-client";

describe("RemoteClient", () => {
  describe("getRemoteClients()", () => {
    const socketsMock = [
      {
        id: "ONE",
        rooms: new Set(["room1"]),
        data: { name: "TEST" },
        join: vi.fn(),
        leave: vi.fn(),
      },
      { id: "TWO", rooms: new Set(["room2"]), join: vi.fn(), leave: vi.fn() },
    ];

    test("should map RemoteSockets to RemoteClients", () => {
      const clients = getRemoteClients({
        sockets: socketsMock as unknown as RemoteSocket<any, unknown>[],
        metadata: z.object({ name: z.string() }),
        emission: {},
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
    });
  });
});
