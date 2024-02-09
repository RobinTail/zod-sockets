import { RemoteSocket } from "socket.io";
import { describe, expect, test } from "vitest";
import { getRemoteClients } from "./remote-client";

describe("RemoteClient", () => {
  describe("getRemoteClients()", () => {
    const socketsMock = [
      { id: "ONE", rooms: new Set(["room1"]), data: { name: "TEST" } },
    ];

    test("should map RemoteSockets to RemoteClients", () => {
      const clients = getRemoteClients(
        socketsMock as RemoteSocket<any, any>[],
        undefined,
      );
      expect(clients).toEqual([
        {
          id: "ONE",
          rooms: ["room1"],
          getData: expect.any(Function),
        },
      ]);

      // getData:
      expect(clients[0].getData()).toEqual({ name: "TEST" });
    });
  });
});
