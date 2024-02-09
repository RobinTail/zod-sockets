import { z } from "zod";

export type Metadata = z.SomeZodObject;

export const defaultMeta = z.object({}).passthrough();

export const parseMeta = <D extends Metadata>(
  data: unknown,
  schema: D | undefined,
): z.output<D> => (schema || defaultMeta).parse(data || {});
