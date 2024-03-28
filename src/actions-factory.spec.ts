import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { Action } from "./action";
import { ActionsFactory } from "./actions-factory";
import { Config } from "./config";

describe("ActionsFactory", () => {
  const factory = new ActionsFactory(new Config());

  describe("constructor", () => {
    test("should create a factory", () => {
      expect(factory).toBeInstanceOf(ActionsFactory);
    });

    test("should produce actions", () => {
      expect(
        factory.build({
          event: "test",
          input: z.tuple([z.string()]),
          handler: vi.fn<any>(),
        }),
      ).toBeInstanceOf(Action);
    });
  });
});
