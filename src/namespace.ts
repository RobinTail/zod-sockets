import { z } from "zod/v4";
import { SecuritySchemeObject } from "./async-api/security";
import { Emission, EmissionMap } from "./emission";
import { Hooks } from "./hooks";

export const rootNS = "/";
export type RootNS = typeof rootNS;

export const normalizeNS = (name: string): string => {
  const trimmed = name.trim();
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

export interface Example<T extends Emission> {
  payload?: z.output<T["schema"]>;
  ack?: T["ack"] extends z.ZodTuple ? z.input<T["ack"]> : never;
}

export interface Namespace<E extends EmissionMap, D extends z.ZodObject> {
  /** @desc The events that the server can emit */
  emission: E;
  /** @desc Examples for the emission per event */
  examples: {
    [K in keyof E]?: Example<E[K]> | Example<E[K]>[];
  };
  /** @desc Handlers for some events in different contexts */
  hooks: Partial<Hooks<E, D>>;
  /** @desc Schema of the client metadata in this namespace */
  metadata: D;
  security: SecuritySchemeObject[];
}

export type Namespaces = Record<string, Namespace<EmissionMap, z.ZodObject>>;
