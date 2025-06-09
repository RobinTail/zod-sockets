import { z } from "zod/v4";
import { functionSchema } from "./function-schema";

describe("Function schema", () => {
  const schema = functionSchema(z.tuple([z.string(), z.number()]), z.boolean());

  test("should be instance of ZodPipe", () => {
    expect(schema).toBeInstanceOf(z.ZodPipe);
  });

  test("should accept valid function", () => {
    const impl = (a: string, b: number) => Boolean(a || b);
    const parsed = schema.parse(impl);
    expect(typeof parsed).toBe("function");
    expectTypeOf(parsed).toEqualTypeOf<(a: string, b: number) => boolean>();
    expect(parsed("123", 456)).toBe(true);
  });

  test("should not accept less arguments", () => {
    const impl = (a: string) => Boolean(a);
    const parsed = schema.parse(impl) as (a: string) => boolean;
    expect(() => parsed("123")).toThrowErrorMatchingSnapshot();
  });

  test("should not accept no arguments", () => {
    const impl = () => false;
    const parsed = schema.parse(impl) as () => boolean;
    expect(() => parsed()).toThrowErrorMatchingSnapshot();
  });

  test("should not accept wrong output", () => {
    const impl = (a: string, b: number) => `${a}${b}`;
    const parsed = schema.parse(impl);
    expect(() => parsed("123", 456)).toThrowErrorMatchingSnapshot();
  });

  test("should not accept wrong args", () => {
    const impl = (a: string, b: number) => Boolean(a || b);
    const parsed = schema.parse(impl);
    expect(() =>
      parsed(true as unknown as string, 456 as unknown as number),
    ).toThrowErrorMatchingSnapshot();
  });

  test("should not accept not-a-function", () => {
    expect(() => schema.parse("test")).toThrowErrorMatchingSnapshot();
  });
});
