import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { Action } from "./action";
import { ActionsFactory } from "./actions-factory";

describe("ActionsFactory", () => {
  const factory = new ActionsFactory({ emission: {}, timeout: 2000 });

  describe("constructor", () => {
    test("should create a factory", () => {
      expect(factory).toBeInstanceOf(ActionsFactory);
    });

    test("should produce actions", () => {
      expect(
        factory.build({
          input: z.tuple([z.string()]),
          handler: vi.fn(),
        }),
      ).toBeInstanceOf(Action);
    });
  });
});
