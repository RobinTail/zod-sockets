import { describe, expect, test } from "vitest";
import { z } from "zod/v4";
import { functionSchema } from "./function-schema";
import { makeEventFnSchema } from "./integration-helpers";

describe("Integration helpers", () => {
  describe("makeEventFnSchema()", () => {
    test("should simply use base when no ack", () => {
      const base = z.tuple([z.string()]);
      const result = makeEventFnSchema(base);
      // @todo update vitest serializer and remove JSON.stringify
      expect(JSON.stringify(result)).toBe(
        JSON.stringify(functionSchema(base, z.void())),
      );
    });

    test("should add ack when no rest in base", () => {
      const base = z.tuple([z.string()]);
      const ack = z.tuple([z.number()]);
      const result = makeEventFnSchema(base, ack);
      expect(JSON.stringify(result)).toBe(
        JSON.stringify(
          functionSchema(
            z.tuple([z.string(), functionSchema(ack, z.void())]),
            z.void(),
          ),
        ),
      );
    });

    test("should use overloads when both rest and ack are present", () => {
      const base = z.tuple([z.string()]).rest(z.unknown());
      const ack = z.tuple([z.number()]);
      const result = makeEventFnSchema(base, ack, 2);
      expect(JSON.stringify(result)).toBe(
        JSON.stringify(
          z.union([
            functionSchema(
              z.tuple([z.string(), functionSchema(ack, z.void())]),
              z.void(),
            ),
            functionSchema(
              z.tuple([
                z.string(),
                z.unknown().describe("rest1"),
                functionSchema(ack, z.void()),
              ]),
              z.void(),
            ),
          ]),
        ),
      );
    });
  });
});
