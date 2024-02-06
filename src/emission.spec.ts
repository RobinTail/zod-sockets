import { Socket } from "socket.io";
import { MockedFunction, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { makeBroadcaster, makeEmitter } from "./emission";
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
    "emit" | "timeout" | "emitWithAck",
    MockedFunction<any>
  > & { id: string; broadcast: typeof broadcastMock } = {
    id: "ID",
    emit: vi.fn(),
    timeout: vi.fn(() => socketMock),
    emitWithAck: vi.fn(),
    broadcast: broadcastMock,
  };
  const loggerMock = { debug: vi.fn() };

  describe.each([
    { maker: makeEmitter, target: socketMock, ack: ["test"] },
    { maker: makeBroadcaster, target: broadcastMock, ack: [["test"]] },
  ])("$maker.name", ({ maker, target, ack }) => {
    const emitter = maker({
      socket: socketMock as unknown as Socket,
      logger: loggerMock as unknown as AbstractLogger,
      timeout: 100,
      emission: {
        one: { schema: z.tuple([z.string()]) },
        two: { schema: z.tuple([z.number()]), ack: z.tuple([z.string()]) },
      },
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
});
