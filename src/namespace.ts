import { z } from "zod/v4";
import { SecuritySchemeObject } from "./async-api/security";
import { EmissionMap } from "./emission";
import { Hooks } from "./hooks";

export const rootNS = "/";
export type RootNS = typeof rootNS;

export const normalizeNS = (name: string): string => {
  const trimmed = name.trim();
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

export interface Namespace<E extends EmissionMap, D extends z.ZodObject> {
  /** @desc The events that the server can emit */
  emission: E;
  /** @desc Handlers for some events in different contexts */
  hooks: Partial<Hooks<E, D>>;
  /** @desc Schema of the client metadata in this namespace */
  metadata: D;
  security: SecuritySchemeObject[];
}

export type Namespaces = Record<string, Namespace<EmissionMap, z.ZodObject>>;
