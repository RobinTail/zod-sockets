import { Socket } from "socket.io";
import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { AbstractAction, Action } from "./action";
import { AckError, ActionError } from "./errors";
import { AbstractLogger } from "./logger";

describe("Action", () => {
  const simpleHandler = vi.fn();
  const simpleAction = new Action({
    event: "simple",
    input: z.tuple([z.string()]),
    handler: simpleHandler,
  });
  const ackHandler = vi.fn(async (): Promise<[number]> => [123]);
  const ackAction = new Action({
    event: "ackOne",
    ns: "test",
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

  describe("getName()", () => {
    test("should return the event name", () => {
      expect(simpleAction.getEvent()).toBe("simple");
      expect(ackAction.getEvent()).toBe("ackOne");
    });
  });

  describe("getNamespace()", () => {
    test("should return the namespace", () => {
      expect(simpleAction.getNamespace()).toBe("/");
      expect(ackAction.getNamespace()).toBe("test");
    });
  });

  describe("getSchema()", () => {
    test("should return input schema", () => {
      expect(JSON.stringify(ackAction.getSchema("input"))).toBe(
        JSON.stringify(z.tuple([z.string()])),
      );
    });
    test("should return output schema", () => {
      expect(JSON.stringify(ackAction.getSchema("output"))).toBe(
        JSON.stringify(z.tuple([z.number()])),
      );
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
    const getRequestMock = vi.fn();
    const withRoomsMock = vi.fn();
    const getRoomsMock = vi.fn();
    const getAllRoomsMock = vi.fn();
    const getAllClientsMock = vi.fn();
    const allBroadcastMock = vi.fn();
    const getDataMock = vi.fn();
    const setDataMock = vi.fn();
    const joinMock = vi.fn();
    const leaveMock = vi.fn();

    test("should handle simple action", async () => {
      await simpleAction.execute({
        event: "test",
        logger: loggerMock as unknown as AbstractLogger,
        params: ["some"],
        withRooms: withRoomsMock,
        all: {
          getClients: getAllClientsMock,
          getRooms: getAllRoomsMock,
          broadcast: allBroadcastMock,
        },
        client: {
          id: "ID",
          handshake: { auth: {} } as Socket["handshake"],
          emit: emitMock,
          broadcast: broadcastMock,
          getRooms: getRoomsMock,
          isConnected: isConnectedMock,
          getRequest: getRequestMock,
          getData: getDataMock,
          setData: setDataMock,
          join: joinMock,
          leave: leaveMock,
        },
      });
      expect(loggerMock.error).not.toHaveBeenCalled();
      expect(simpleHandler).toHaveBeenLastCalledWith({
        input: ["some"],
        logger: loggerMock,
        withRooms: withRoomsMock,
        all: {
          getClients: getAllClientsMock,
          getRooms: getAllRoomsMock,
          broadcast: allBroadcastMock,
        },
        client: {
          id: "ID",
          handshake: { auth: {} },
          emit: emitMock,
          broadcast: broadcastMock,
          isConnected: isConnectedMock,
          getRequest: getRequestMock,
          getRooms: getRoomsMock,
          getData: getDataMock,
          setData: setDataMock,
          join: joinMock,
          leave: leaveMock,
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
          getClients: getAllClientsMock,
          getRooms: getAllRoomsMock,
          broadcast: allBroadcastMock,
        },
        client: {
          id: "ID",
          handshake: { auth: {} } as Socket["handshake"],
          emit: emitMock,
          broadcast: broadcastMock,
          getRooms: getRoomsMock,
          isConnected: isConnectedMock,
          getRequest: getRequestMock,
          getData: getDataMock,
          setData: setDataMock,
          join: joinMock,
          leave: leaveMock,
        },
      });
      expect(loggerMock.error).not.toHaveBeenCalled();
      expect(ackHandler).toHaveBeenLastCalledWith({
        client: {
          id: "ID",
          handshake: { auth: {} },
          getRooms: getRoomsMock,
          isConnected: isConnectedMock,
          getRequest: getRequestMock,
          emit: emitMock,
          broadcast: broadcastMock,
          getData: getDataMock,
          setData: setDataMock,
          join: joinMock,
          leave: leaveMock,
        },
        all: {
          getClients: getAllClientsMock,
          getRooms: getAllRoomsMock,
          broadcast: allBroadcastMock,
        },
        withRooms: withRoomsMock,
        input: ["some"],
        logger: loggerMock,
      });
      expect(ackMock).toHaveBeenLastCalledWith(123); // from ackHandler
    });

    test("should throw input parsing error", async () => {
      await expect(
        simpleAction.execute({
          event: "test",
          logger: loggerMock as unknown as AbstractLogger,
          params: [], // too short
          withRooms: withRoomsMock,
          all: {
            getClients: getAllClientsMock,
            getRooms: getAllRoomsMock,
            broadcast: allBroadcastMock,
          },
          client: {
            id: "ID",
            handshake: { auth: {} } as Socket["handshake"],
            getRooms: getRoomsMock,
            isConnected: isConnectedMock,
            getRequest: getRequestMock,
            emit: emitMock,
            broadcast: broadcastMock,
            getData: getDataMock,
            setData: setDataMock,
            join: joinMock,
            leave: leaveMock,
          },
        }),
      ).rejects.toThrowError(
        new ActionError(
          new z.ZodError([
            {
              code: "too_small",
              minimum: 1,
              inclusive: true,
              exact: false,
              type: "array",
              path: [],
              message: "Array must contain at least 1 element(s)",
            },
          ]),
        ),
      );
    });

    test.each(["not cb", vi.fn()])(
      "should throw acknowledgment related errors %#",
      async (ack) => {
        if (typeof ack === "function") {
          ackHandler.mockImplementationOnce(async () => [
            "not number" as unknown as number,
          ]);
        }
        await expect(
          ackAction.execute({
            event: "test",
            logger: loggerMock as unknown as AbstractLogger,
            params: ["test", ack],
            withRooms: withRoomsMock,
            all: {
              getClients: getAllClientsMock,
              getRooms: getAllRoomsMock,
              broadcast: allBroadcastMock,
            },
            client: {
              id: "ID",
              handshake: { auth: {} } as Socket["handshake"],
              getRooms: getRoomsMock,
              isConnected: isConnectedMock,
              getRequest: getRequestMock,
              emit: emitMock,
              broadcast: broadcastMock,
              getData: getDataMock,
              setData: setDataMock,
              join: joinMock,
              leave: leaveMock,
            },
          }),
        ).rejects.toThrowError(
          typeof ack === "function"
            ? new AckError(
                "action",
                new z.ZodError([
                  {
                    code: "invalid_type",
                    expected: "number",
                    received: "string",
                    path: [0],
                    message: "Expected number, received string",
                  },
                ]),
              )
            : new ActionError(
                new z.ZodError([
                  {
                    code: "invalid_type",
                    expected: "function",
                    received: "string",
                    path: [],
                    message: "Expected function, received string",
                  },
                ]),
              ),
        );
      },
    );
  });
});
