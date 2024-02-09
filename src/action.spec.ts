import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { AbstractAction, Action } from "./action";
import { AbstractLogger } from "./logger";

describe("Action", () => {
  const simpleHandler = vi.fn();
  const simpleAction = new Action({
    input: z.tuple([z.string()]),
    handler: simpleHandler,
  });
  const ackHandler = vi.fn(async (): Promise<[number]> => [123]);
  const ackAction = new Action({
    input: z.tuple([z.string()]),
    output: z.tuple([z.number()]),
    handler: ackHandler,
  });

  describe("constructor", () => {
    test("should create inheritor of AbstractAction", () => {
      expect(simpleAction).toBeInstanceOf(Action);
      expect(simpleAction).toBeInstanceOf(AbstractAction);
    });
  });

  describe("execute()", () => {
    const loggerMock = {
      error: vi.fn(),
      debug: vi.fn(),
    };
    const emitMock = vi.fn();
    const broadcastMock = vi.fn();
    const isConnectedMock = vi.fn();
    const withRoomsMock = vi.fn();
    const getRoomsMock = vi.fn();
    const getAllRoomsMock = vi.fn();
    const getAllClientsMock = vi.fn();

    test("should handle simple action", async () => {
      await simpleAction.execute({
        event: "test",
        logger: loggerMock as unknown as AbstractLogger,
        params: ["some"],
        withRooms: withRoomsMock,
        all: {
          broadcast: broadcastMock,
          getClients: getAllClientsMock,
          getRooms: getAllRoomsMock,
        },
        client: {
          emit: emitMock,
          getRooms: getRoomsMock,
          isConnected: isConnectedMock,
          id: "ID",
        },
      });
      expect(loggerMock.error).not.toHaveBeenCalled();
      expect(simpleHandler).toHaveBeenLastCalledWith({
        input: ["some"],
        logger: loggerMock,
        withRooms: withRoomsMock,
        all: {
          broadcast: broadcastMock,
          getClients: getAllClientsMock,
          getRooms: getAllRoomsMock,
        },
        client: {
          emit: emitMock,
          isConnected: isConnectedMock,
          getRooms: getRoomsMock,
          id: "ID",
        },
      });
    });

    test("should handle action with ack", async () => {
      const ackMock = vi.fn();
      await ackAction.execute({
        event: "test",
        logger: loggerMock as unknown as AbstractLogger,
        params: ["some", ackMock],
        withRooms: withRoomsMock,
        all: {
          broadcast: broadcastMock,
          getClients: getAllClientsMock,
          getRooms: getAllRoomsMock,
        },
        client: {
          emit: emitMock,
          getRooms: getRoomsMock,
          isConnected: isConnectedMock,
          id: "ID",
        },
      });
      expect(loggerMock.error).not.toHaveBeenCalled();
      expect(ackHandler).toHaveBeenLastCalledWith({
        client: {
          id: "ID",
          getRooms: getRoomsMock,
          isConnected: isConnectedMock,
          emit: emitMock,
        },
        all: {
          broadcast: broadcastMock,
          getClients: getAllClientsMock,
          getRooms: getAllRoomsMock,
        },
        withRooms: withRoomsMock,
        input: ["some"],
        logger: loggerMock,
      });
      expect(ackMock).toHaveBeenLastCalledWith(123); // from ackHandler
    });

    test("should catch errors", async () => {
      await simpleAction.execute({
        event: "test",
        logger: loggerMock as unknown as AbstractLogger,
        params: [], // too short
        withRooms: withRoomsMock,
        all: {
          broadcast: broadcastMock,
          getClients: getAllClientsMock,
          getRooms: getAllRoomsMock,
        },
        client: {
          id: "ID",
          getRooms: getRoomsMock,
          isConnected: isConnectedMock,
          emit: emitMock,
        },
      });
      expect(loggerMock.error).toHaveBeenCalled();
    });
  });
});
