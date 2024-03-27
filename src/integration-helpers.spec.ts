import { describe, expect, test } from "vitest";
import { z } from "zod";
import { makeEventFnSchema } from "./integration-helpers";

describe("Integration helpers", () => {
  describe("makeEventFnSchema()", () => {
    test("should simply use base when no ack", () => {
      const base = z.tuple([z.string()]);
      const result = makeEventFnSchema(base);
      expect(JSON.stringify(result)).toBe(
        JSON.stringify(z.function(base, z.void())),
      );
    });

    test("should add ack when no rest in base", () => {
      const base = z.tuple([z.string()]);
      const ack = z.tuple([z.number()]);
      const result = makeEventFnSchema(base, ack);
      expect(JSON.stringify(result)).toBe(
        JSON.stringify(
          z.function(
            z.tuple([z.string(), z.function(ack, z.void())]),
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
            z.function(
              z.tuple([z.string(), z.function(ack, z.void())]),
              z.void(),
            ),
            z.function(
              z.tuple([
                z.string(),
                z.unknown().describe("rest1"),
                z.function(ack, z.void()),
              ]),
              z.void(),
            ),
          ]),
        ),
      );
    });
  });
});
