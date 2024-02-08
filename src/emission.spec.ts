import { Socket } from "socket.io";
import { MockedFunction, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { makeBroadcaster, makeEmitter, makeRoomService } from "./emission";
import { AbstractLogger } from "./logger";

describe("Emission", () => {
  const broadcastMock: Record<
    "emit" | "timeout" | "emitWithAck",
    MockedFunction<any>
  > = {
    emit: vi.fn(),
    timeout: vi.fn(() => broadcastMock),
    emitWithAck: vi.fn(),
  };

  const socketMock: Record<
    "emit" | "timeout" | "emitWithAck" | "join" | "leave",
    MockedFunction<any>
  > & {
    id: string;
    broadcast: typeof broadcastMock;
    to: (rooms: string | string[]) => typeof broadcastMock;
  } = {
    id: "ID",
    emit: vi.fn(),
    timeout: vi.fn(() => socketMock),
    emitWithAck: vi.fn(),
    broadcast: broadcastMock,
    to: vi.fn(() => broadcastMock),
    join: vi.fn(),
    leave: vi.fn(),
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
          socket: socketMock as unknown as Socket,
          config,
        });
        expect(typeof withRooms).toBe("function");
        const { broadcast, leave, join } = withRooms(rooms);
        expect(socketMock.to).toHaveBeenLastCalledWith(rooms);
        for (const method of [broadcast, leave, join]) {
          expect(typeof method).toBe("function");
        }
        join();
        expect(socketMock.join).toHaveBeenLastCalledWith(rooms);
        if (typeof rooms === "string") {
          leave();
          expect(socketMock.leave).toHaveBeenLastCalledWith(rooms);
        } else {
          await leave();
          for (const room of rooms) {
            expect(socketMock.leave).toHaveBeenCalledWith(room);
          }
        }
      },
    );
  });
});
