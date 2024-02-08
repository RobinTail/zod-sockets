import http from "node:http";
import { Server } from "socket.io";
import { describe, expect, test, vi } from "vitest";
import { attachSockets } from "./attach";
import { AbstractLogger } from "./logger";

describe("Attach", () => {
  describe("attachSockets()", () => {
    const socketMock = {
      id: "ID",
      connected: false,
      rooms: new Set(["room1", "room2"]),
      on: vi.fn(),
      onAny: vi.fn(),
    };
    const adapterMock = {
      rooms: new Map([
        ["room1", ["ID"]],
        ["room2", ["ID"]],
        ["room3", ["other"]],
      ]),
    };
    const ioMock = {
      on: vi.fn(),
      attach: vi.fn(),
      of: vi.fn(() => ({
        adapter: adapterMock,
      })),
      fetchSockets: vi.fn(async () => [
        { id: "ID", rooms: new Set(["room1", "room2"]) },
        { id: "other", rooms: new Set(["room3"]) },
      ]),
    };
    const targetMock = {
      address: vi.fn(),
    };
    const loggerMock = { info: vi.fn(), debug: vi.fn() };
    const actionsMock = { test: { execute: vi.fn() } };

    test("should set the listeners", async () => {
      attachSockets({
        io: ioMock as unknown as Server,
        target: targetMock as unknown as http.Server,
        actions: actionsMock,
        config: {
          timeout: 100,
          emission: {},
          logger: loggerMock as unknown as AbstractLogger,
        },
      });
      expect(ioMock.attach).toHaveBeenCalledWith(targetMock);
      expect(ioMock.on).toHaveBeenLastCalledWith(
        "connection",
        expect.any(Function),
      );

      // on connection:
      await ioMock.on.mock.lastCall![1](socketMock);
      expect(loggerMock.debug).toHaveBeenLastCalledWith("User connected", "ID");
      expect(socketMock.onAny).toHaveBeenLastCalledWith(expect.any(Function));
      expect(socketMock.on).toHaveBeenCalledWith("test", expect.any(Function));
      expect(socketMock.on).toHaveBeenLastCalledWith(
        "disconnect",
        expect.any(Function),
      );

      // on disconnect:
      socketMock.on.mock.lastCall![1]();
      expect(loggerMock.debug).toHaveBeenLastCalledWith(
        "User disconnected",
        "ID",
      );

      // on any event:
      socketMock.onAny.mock.lastCall![0]("test");
      expect(loggerMock.debug).toHaveBeenLastCalledWith("test from ID");

      // on the listened event:
      const call = socketMock.on.mock.calls.find(([evt]) => evt === "test");
      expect(call).toBeTruthy();
      await call[1]([123, 456]);
      expect(actionsMock.test.execute).toHaveBeenLastCalledWith({
        broadcast: expect.any(Function),
        withRooms: expect.any(Function),
        getAllClients: expect.any(Function),
        getAllRooms: expect.any(Function),
        emit: expect.any(Function),
        event: "test",
        logger: loggerMock,
        params: [[123, 456]],
        client: {
          id: "ID",
          isConnected: expect.any(Function),
          getRooms: expect.any(Function),
        },
      });

      // getRooms:
      expect(
        actionsMock.test.execute.mock.lastCall[0].client.getRooms(),
      ).toEqual(["room1", "room2"]);

      // isConnected:
      expect(
        actionsMock.test.execute.mock.lastCall[0].client.isConnected(),
      ).toBeFalsy();

      // getAllRooms:
      expect(actionsMock.test.execute.mock.lastCall[0].getAllRooms()).toEqual([
        "room1",
        "room2",
        "room3",
      ]);
      expect(ioMock.of).toHaveBeenLastCalledWith("/");

      // getAllClients:
      await expect(
        actionsMock.test.execute.mock.lastCall[0].getAllClients(),
      ).resolves.toEqual([
        { id: "ID", rooms: ["room1", "room2"] },
        { id: "other", rooms: ["room3"] },
      ]);
    });
  });
});
