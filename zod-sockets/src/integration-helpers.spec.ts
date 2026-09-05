import { z } from "zod";
import { makeEventFnSchema, hasCycle } from "./integration-helpers";

describe("Integration helpers", () => {
  describe("makeEventFnSchema()", () => {
    test("should simply use base when no ack", () => {
      const base = z.tuple([z.string()]);
      const result = makeEventFnSchema(base);
      expect(result).toMatchSnapshot();
    });

    test("should add ack when no rest in base", () => {
      const base = z.tuple([z.string()]);
      const ack = z.tuple([z.number()]);
      const result = makeEventFnSchema(base, ack);
      expect(result).toMatchSnapshot();
    });

    test("should use overloads when both rest and ack are present", () => {
      const base = z.tuple([z.string()]).rest(z.unknown());
      const ack = z.tuple([z.number()]);
      const result = makeEventFnSchema(base, ack, 2);
      expect(result).toMatchSnapshot();
    });
  });

  describe("hasCycle()", () => {
    test.each(["input", "output"] as const)(
      "can find circular references %#",
      (io) => {
        const schema = z.object({
          name: z.string(),
          get features() {
            return schema.array();
          },
        });
        const result = hasCycle(schema, { io });
        expect(result).toBeTruthy();
      },
    );

    test.each(["input", "output"] as const)(
      "can handle references having meta id %#",
      (io) => {
        const schema = z
          .object({
            title: z.string(),
            get features() {
              return z.array(schema).optional();
            },
          })
          .meta({ id: "Feature" });
        const result = hasCycle(schema, { io });
        expect(result).toBeTruthy();
      },
    );

    test.each(["input", "output"] as const)(
      "should avoid false-positive results for non-cyclic schemas having id %#",
      (io) => {
        const schema = z.object({ title: z.string() }).meta({ id: "Feature" });
        expect(hasCycle(schema, { io })).toBe(false);
      },
    );

    test.each(["input", "output"] as const)(
      "can detect a bare self-reference %#",
      (io) => {
        const schema: z.core.$ZodType = z.lazy(() => schema);
        const result = hasCycle(schema, { io });
        expect(result).toBeTruthy();
      },
    );
  });
});
