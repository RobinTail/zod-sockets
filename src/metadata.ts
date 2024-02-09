import { z } from "zod";

export type Metadata = z.SomeZodObject;

export const defaultMeta = z.object({}).passthrough();
