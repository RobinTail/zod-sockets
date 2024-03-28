import http from "node:http";
import { Server } from "socket.io";
import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { attachSockets } from "./attach";
import { Config } from "./config";
import { AbstractLogger } from "./logger";

describe("Attach", () => {
  describe("attachSockets()", () => {
    const socketMock = {
      id: "ID",
      connected: false,
      rooms: new Set(["room1", "room2"]),
      on: vi.fn(),
      onAny: vi.fn(),
      onAnyOutgoing: vi.fn(),
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
    const nsMock = {
      on: vi.fn(),
      adapter: adapterMock,
      fetchSockets: vi.fn(async () => [
        {
          id: "ID",
          rooms: new Set(["room1", "room2"]),
          join: vi.fn(),
          leave: vi.fn(),
        },
        {
          id: "other",
          rooms: new Set(["room3"]),
          join: vi.fn(),
          leave: vi.fn(),
        },
      ]),
    };
    const ioMock = {
      attach: vi.fn(),
      of: vi.fn(() => nsMock),
    };
    const targetMock = {
      address: vi.fn(),
    };
    const loggerMock = { info: vi.fn(), debug: vi.fn() };
    const actionsMock = [
      {
        execute: vi.fn(),
        getNamespace: () => "/",
        getEvent: () => "test",
        getSchema: vi.fn(),
      },
    ];

    test("should set the listeners", async () => {
      const hooks = {};
      (hooks as any).stub = vi.fn(); // for ensureNamespaces without setting actual hooks
      await attachSockets({
        io: ioMock as unknown as Server,
        target: targetMock as unknown as http.Server,
        actions: actionsMock,
        config: new Config({
          startupLogo: false,
          timeout: 100,
          namespaces: {
            "/": {
              emission: {},
              hooks,
              metadata: z.object({ name: z.string() }),
            },
          },
          logger: loggerMock as unknown as AbstractLogger,
        }),
      });
      expect(ioMock.of).toHaveBeenLastCalledWith("/");
      expect(ioMock.attach).toHaveBeenCalledWith(targetMock);
      expect(nsMock.on).toHaveBeenLastCalledWith(
        "connection",
        expect.any(Function),
      );

      // on connection:
      await nsMock.on.mock.lastCall![1](socketMock);
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

      // on any incoming:
      socketMock.onAny.mock.lastCall![0]("test");
      expect(loggerMock.debug).toHaveBeenLastCalledWith("test from ID", {});

      // on any outgoing:
      socketMock.onAnyOutgoing.mock.lastCall![0]("test");
      expect(loggerMock.debug).toHaveBeenLastCalledWith("Sending test", []);

      // on the listened event:
      const call = socketMock.on.mock.calls.find(([evt]) => evt === "test");
      expect(call).toBeTruthy();
      await call[1]([123, 456]);
      expect(actionsMock[0].execute).toHaveBeenLastCalledWith({
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
        all: {
          getClients: expect.any(Function),
          getRooms: expect.any(Function),
          broadcast: expect.any(Function),
        },
      });

      // client.getRooms:
      expect(actionsMock[0].execute.mock.lastCall[0].client.getRooms()).toEqual(
        ["room1", "room2"],
      );

      // client.isConnected:
      expect(
        actionsMock[0].execute.mock.lastCall[0].client.isConnected(),
      ).toBeFalsy();

      // all.getRooms:
      expect(actionsMock[0].execute.mock.lastCall[0].all.getRooms()).toEqual([
        "room1",
        "room2",
        "room3",
      ]);
      expect(ioMock.of).toHaveBeenLastCalledWith("/");

      // all.getClients:
      await expect(
        actionsMock[0].execute.mock.lastCall[0].all.getClients(),
      ).resolves.toEqual([
        {
          id: "ID",
          rooms: ["room1", "room2"],
          getData: expect.any(Function),
          join: expect.any(Function),
          leave: expect.any(Function),
        },
        {
          id: "other",
          rooms: ["room3"],
          getData: expect.any(Function),
          join: expect.any(Function),
          leave: expect.any(Function),
        },
      ]);

      // client.setData:
      actionsMock[0].execute.mock.lastCall[0].client.setData({
        name: "user",
      });
      expect(() =>
        actionsMock[0].execute.mock.lastCall[0].client.setData({
          name: 123,
        }),
      ).toThrow(z.ZodError);

      // client.getData:
      expect(actionsMock[0].execute.mock.lastCall[0].client.getData()).toEqual({
        name: "user",
      });

      // join/leave:
      for (const rooms of ["room1", ["room2", "room3"]]) {
        actionsMock[0].execute.mock.lastCall[0].client.join(rooms);
        expect(socketMock.join).toHaveBeenLastCalledWith(rooms);
        if (typeof rooms === "string") {
          actionsMock[0].execute.mock.lastCall[0].client.leave(rooms);
          expect(socketMock.leave).toHaveBeenLastCalledWith(rooms);
        } else {
          await actionsMock[0].execute.mock.lastCall[0].client.leave(rooms);
          for (const room of rooms) {
            expect(socketMock.leave).toHaveBeenCalledWith(room);
          }
        }
      }
    });
  });
});
