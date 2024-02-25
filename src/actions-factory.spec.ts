import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { Action } from "./action";
import { ActionsFactory } from "./actions-factory";
import { AbstractLogger } from "./logger";

describe("ActionsFactory", () => {
  const factory = new ActionsFactory({
    emission: {},
    timeout: 2000,
    logger: { debug: vi.fn() } as unknown as AbstractLogger,
    metadata: z.object({}),
  });

  describe("constructor", () => {
    test("should create a factory", () => {
      expect(factory).toBeInstanceOf(ActionsFactory);
    });

    test("should produce actions", () => {
      expect(
        factory.build({
          event: "test",
          input: z.tuple([z.string()]),
          handler: vi.fn(),
        }),
      ).toBeInstanceOf(Action);
    });
  });
});
