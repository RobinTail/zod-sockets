import { Socket } from "socket.io";
import { z } from "zod";
import { AbstractAction, Action } from "./action";
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

  describe(".event", () => {
    test("should be the event name", () => {
      expect(simpleAction.event).toBe("simple");
      expect(ackAction.event).toBe("ackOne");
    });
  });

  describe(".namespace", () => {
    test("should be the namespace", () => {
      expect(simpleAction.namespace).toBe("/");
      expect(ackAction.namespace).toBe("test");
    });
  });

  describe.each<keyof typeof ackAction>(["inputSchema", "outputSchema"])(
    ".%s",
    (prop) => {
      test("should be the schema", () => {
        expect(ackAction[prop]).toMatchSnapshot();
      });
    },
  );

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
          params: [], // first one missing
        }),
      ).rejects.toThrowErrorMatchingSnapshot();
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
            ...commons,
            logger: loggerMock as unknown as AbstractLogger,
            params: ["test", ack],
          }),
        ).rejects.toThrowErrorMatchingSnapshot();
      },
    );
  });
});
