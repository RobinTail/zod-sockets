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
      join: vi.fn(),
      leave: vi.fn(),
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
        fetchSockets: vi.fn(async () => [
          { id: "ID", rooms: new Set(["room1", "room2"]) },
          { id: "other", rooms: new Set(["room3"]) },
        ]),
      })),
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
      expect(loggerMock.debug).toHaveBeenLastCalledWith("Client connected", {
        id: "ID",
      });
      expect(socketMock.onAny).toHaveBeenLastCalledWith(expect.any(Function));
      expect(socketMock.on).toHaveBeenCalledWith("test", expect.any(Function));
      expect(socketMock.on).toHaveBeenLastCalledWith(
        "disconnect",
        expect.any(Function),
      );

      // on disconnect:
      socketMock.on.mock.lastCall![1]();
      expect(loggerMock.debug).toHaveBeenLastCalledWith("Client disconnected", {
        id: "ID",
      });

      // on any event:
      socketMock.onAny.mock.lastCall![0]("test");
      expect(loggerMock.debug).toHaveBeenLastCalledWith("test from ID", {});

      // on the listened event:
      const call = socketMock.on.mock.calls.find(([evt]) => evt === "test");
      expect(call).toBeTruthy();
      await call[1]([123, 456]);
      expect(actionsMock.test.execute).toHaveBeenLastCalledWith({
        withRooms: expect.any(Function),
        event: "test",
        logger: loggerMock,
        params: [[123, 456]],
        client: {
          id: "ID",
          isConnected: expect.any(Function),
          getRooms: expect.any(Function),
          emit: expect.any(Function),
          broadcast: expect.any(Function),
          getData: expect.any(Function),
          setData: expect.any(Function),
          join: expect.any(Function),
          leave: expect.any(Function),
        },
        getAllClients: expect.any(Function),
        getAllRooms: expect.any(Function),
      });

      // client.getRooms:
      expect(
        actionsMock.test.execute.mock.lastCall[0].client.getRooms(),
      ).toEqual(["room1", "room2"]);

      // client.isConnected:
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
        {
          id: "ID",
          rooms: ["room1", "room2"],
          getData: expect.any(Function),
        },
        {
          id: "other",
          rooms: ["room3"],
          getData: expect.any(Function),
        },
      ]);

      // client.setData:
      actionsMock.test.execute.mock.lastCall[0].client.setData({
        name: "user",
      });

      // client.getData:
      expect(
        actionsMock.test.execute.mock.lastCall[0].client.getData(),
      ).toEqual({
        name: "user",
      });

      // join/leave:
      for (const rooms of ["room1", ["room2", "room3"]]) {
        actionsMock.test.execute.mock.lastCall[0].client.join(rooms);
        expect(socketMock.join).toHaveBeenLastCalledWith(rooms);
        if (typeof rooms === "string") {
          actionsMock.test.execute.mock.lastCall[0].client.leave(rooms);
          expect(socketMock.leave).toHaveBeenLastCalledWith(rooms);
        } else {
          await actionsMock.test.execute.mock.lastCall[0].client.leave(rooms);
          for (const room of rooms) {
            expect(socketMock.leave).toHaveBeenCalledWith(room);
          }
        }
      }
    });
  });
});
