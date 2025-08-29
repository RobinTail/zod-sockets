import { z } from "zod";
import { makeEventFnSchema } from "./integration-helpers";

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
});
