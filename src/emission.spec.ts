import { Socket } from "socket.io";
import { z } from "zod/v4";
import { makeEmitter, makeRoomService } from "./emission";

describe("Emission", () => {
  const broadcastMock = {
    emit: vi.fn(),
    timeout: vi.fn(() => broadcastMock),
    emitWithAck: vi.fn(),
    fetchSockets: vi.fn(async () => [
      {
        id: "ID",
        rooms: new Set(["room1", "room2"]),
        join: vi.fn(),
        leave: vi.fn(),
      },
      { id: "other", rooms: new Set(["room3"]), join: vi.fn(), leave: vi.fn() },
    ]),
  };

  const socketMock = {
    id: "ID",
    emit: vi.fn(),
    timeout: vi.fn(() => socketMock),
    emitWithAck: vi.fn(),
    broadcast: broadcastMock,
    to: vi.fn(() => broadcastMock),
    in: vi.fn(() => broadcastMock),
  };
  const emitCfg = {
    timeout: 100,
    emission: {
      one: { schema: z.tuple([z.string()]) },
      two: { schema: z.tuple([z.number()]), ack: z.tuple([z.string()]) },
    },
  };

  describe("makeEmitter()", () => {
    describe.each([
      { name: "socket", subject: socketMock, ack: ["test"] },
      { name: "broadcast", subject: broadcastMock, ack: [["test"]] },
    ])("with $name", ({ subject, ack }) => {
      const emitter = makeEmitter({
        subject: subject as unknown as Socket,
        ...emitCfg,
      });

      test("should create an emitter", () => {
        expect(typeof emitter).toBe("function");
      });

      test("should throw on unknown events", async () => {
        await expect(emitter("invalid" as "one", "test")).rejects.toThrowError(
          "Unsupported event invalid",
        );
      });

      test("should emit simple events", async () => {
        expect(await emitter("one", "test")).toBeTruthy();
        expect(subject.emit).toHaveBeenLastCalledWith("one", "test");
      });

      test("should emit events with ack", async () => {
        subject.emitWithAck.mockImplementationOnce(async () => ack);
        expect(await emitter("two", 123)).toEqual(ack as unknown[]);
      });
    });
  });

  describe("makeRoomService", () => {
    test.each(["room1", ["room2", "room3"]])(
      "should provide methods in rooms context %#",
      async (rooms) => {
        const withRooms = makeRoomService({
          subject: socketMock as unknown as Socket,
          metadata: z.object({}),
          ...emitCfg,
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
            join: expect.any(Function),
            leave: expect.any(Function),
            emit: expect.any(Function),
          },
          {
            id: "other",
            rooms: ["room3"],
            getData: expect.any(Function),
            join: expect.any(Function),
            leave: expect.any(Function),
            emit: expect.any(Function),
          },
        ]);
      },
    );
  });
});
