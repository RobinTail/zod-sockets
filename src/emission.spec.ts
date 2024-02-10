import { Socket } from "socket.io";
import { MockedFunction, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { makeBroadcaster, makeEmitter, makeRoomService } from "./emission";
import { AbstractLogger } from "./logger";

describe("Emission", () => {
  const broadcastMock: Record<
    "emit" | "timeout" | "emitWithAck" | "fetchSockets",
    MockedFunction<any>
  > = {
    emit: vi.fn(),
    timeout: vi.fn(() => broadcastMock),
    emitWithAck: vi.fn(),
    fetchSockets: vi.fn(async () => [
      { id: "ID", rooms: new Set(["room1", "room2"]) },
      { id: "other", rooms: new Set(["room3"]) },
    ]),
  };

  const socketMock: Record<
    "emit" | "timeout" | "emitWithAck",
    MockedFunction<any>
  > & {
    id: string;
    broadcast: typeof broadcastMock;
    to: (rooms: string | string[]) => typeof broadcastMock;
    in: (rooms: string | string[]) => typeof broadcastMock;
  } = {
    id: "ID",
    emit: vi.fn(),
    timeout: vi.fn(() => socketMock),
    emitWithAck: vi.fn(),
    broadcast: broadcastMock,
    to: vi.fn(() => broadcastMock),
    in: vi.fn(() => broadcastMock),
  };
  const loggerMock = { debug: vi.fn() };
  const config = {
    logger: loggerMock as unknown as AbstractLogger,
    timeout: 100,
    emission: {
      one: { schema: z.tuple([z.string()]) },
      two: { schema: z.tuple([z.number()]), ack: z.tuple([z.string()]) },
    },
  };

  describe.each([
    { maker: makeEmitter, target: socketMock, ack: ["test"] },
    { maker: makeBroadcaster, target: broadcastMock, ack: [["test"]] },
  ])("$maker.name", ({ maker, target, ack }) => {
    const emitter = maker({
      socket: socketMock as unknown as Socket,
      config,
    });

    test("should create an emitter", () => {
      expect(typeof emitter).toBe("function");
    });

    test("should throw on unknown events", async () => {
      await expect(emitter("invalid" as "one")).rejects.toThrowError(
        "Unsupported event invalid",
      );
    });

    test("should emit simple events", async () => {
      expect(await emitter("one", "test")).toBeTruthy();
      expect(target.emit).toHaveBeenLastCalledWith("one", "test");
    });

    test("should emit events with ack", async () => {
      target.emitWithAck.mockImplementationOnce(async () => ack);
      expect(await emitter("two", 123)).toEqual(ack);
    });
  });

  describe("makeRoomService", () => {
    test.each(["room1", ["room2", "room3"]])(
      "should provide methods in rooms context %#",
      async (rooms) => {
        const withRooms = makeRoomService({
          subject: socketMock as unknown as Socket,
          config,
        });
        expect(typeof withRooms).toBe("function");
        const { broadcast, getClients } = withRooms(rooms);
        expect(socketMock.to).toHaveBeenLastCalledWith(rooms);
        expect(typeof broadcast).toBe("function");
        await expect(getClients()).resolves.toEqual([
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
      },
    );
  });
});
