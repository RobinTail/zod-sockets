import { z } from "zod";
import { EmissionMap } from "./emission";
import { Hooks } from "./hooks";

export const rootNS = "/";
export type RootNS = typeof rootNS;

export const normalizeNS = (name: string): string => {
  const trimmed = name.trim();
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

export interface Namespace<E extends EmissionMap, D extends z.SomeZodObject> {
  /**
   * @desc The events that the server can emit
   * @default {}
   * */
  emission: E;
  /**
   * @desc Handlers for some events in different contexts
   * @default {}
   * */
  hooks: Hooks<E>;
  /**
   * @desc Schema of the client metadata in this namespace
   * @default z.object({})
   * */
  metadata: D;
}

export type Namespaces = Record<
  string,
  Namespace<EmissionMap, z.SomeZodObject>
>;

export const fallbackNamespaces = {
  [rootNS]: {
    emission: {},
    hooks: {},
    metadata: z.object({}),
  } satisfies Namespace<{}, z.ZodObject<{}>>,
};
export type FallbackNamespaces = typeof fallbackNamespaces;
