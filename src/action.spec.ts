import { Socket } from "socket.io";
import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { AbstractAction, Action } from "./action";
import { OutputValidationError, InputValidationError } from "./errors";
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

    const commons = {
      withRooms: vi.fn(),
      all: {
        getClients: vi.fn(),
        getRooms: vi.fn(),
        broadcast: vi.fn(),
      },
      client: {
        id: "ID",
        handshake: { auth: {} } as Socket["handshake"],
        emit: vi.fn(),
        broadcast: vi.fn(),
        getRooms: vi.fn(),
        isConnected: vi.fn(),
        getRequest: vi.fn(),
        getData: vi.fn(),
        setData: vi.fn(),
        join: vi.fn(),
        leave: vi.fn(),
      },
    };

    test("should handle simple action", async () => {
      await simpleAction.execute({
        ...commons,
        logger: loggerMock as unknown as AbstractLogger,
        params: ["some"],
      });
      expect(loggerMock.error).not.toHaveBeenCalled();
      expect(simpleHandler).toHaveBeenLastCalledWith({
        ...commons,
        input: ["some"],
        logger: loggerMock,
      });
    });

    test("should handle action with ack", async () => {
      const ackMock = vi.fn();
      await ackAction.execute({
        ...commons,
        logger: loggerMock as unknown as AbstractLogger,
        params: ["some", ackMock],
      });
      expect(loggerMock.error).not.toHaveBeenCalled();
      expect(ackHandler).toHaveBeenLastCalledWith({
        ...commons,
        input: ["some"],
        logger: loggerMock,
      });
      expect(ackMock).toHaveBeenLastCalledWith(123); // from ackHandler
    });

    test("should throw input parsing error", async () => {
      await expect(
        simpleAction.execute({
          ...commons,
          logger: loggerMock as unknown as AbstractLogger,
          params: [], // too short
        }),
      ).rejects.toThrowError(
        new InputValidationError(
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

    test.each([
      [
        "not cb",
        new InputValidationError(
          new z.ZodError([
            {
              code: "invalid_type",
              expected: "function",
              received: "string",
              path: [1],
              message: "Expected function, received string",
            },
          ]),
        ),
      ],
      [
        vi.fn(),
        new OutputValidationError(
          new z.ZodError([
            {
              code: "invalid_type",
              expected: "number",
              received: "string",
              path: [0],
              message: "Expected number, received string",
            },
          ]),
        ),
      ],
    ])("should throw acknowledgment related errors %#", async (ack, error) => {
      if (typeof ack === "function") {
        ackHandler.mockImplementationOnce(async () => [
          "not number" as unknown as number,
        ]);
      }
      await expect(
        ackAction.execute({
          ...commons,
          logger: loggerMock as unknown as AbstractLogger,
          params: ["test", ack],
        }),
      ).rejects.toThrowError(error);
    });
  });
});
