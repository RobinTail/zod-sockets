import { z } from "zod";
import { Emission, EmissionMap } from "./emission";
import { Hooks } from "./hooks";

export const rootNS = "/";
export type RootNS = typeof rootNS;

export const normalizeNS = (name: string): string => {
  const trimmed = name.trim();
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

interface Examples<T extends Emission> {
  payload?: z.output<T["schema"]>;
  ack?: T["ack"] extends z.AnyZodTuple ? z.input<T["ack"]> : never;
}

export interface Namespace<E extends EmissionMap, D extends z.SomeZodObject> {
  /**
   * @desc The events that the server can emit
   * @default {}
   * */
  emission: E;
  examples?: {
    [K in keyof E]?: Examples<E[K]> | Examples<E[K]>[];
  };
  /**
   * @desc Handlers for some events in different contexts
   * @default {}
   * */
  hooks: Hooks<E, D>;
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
