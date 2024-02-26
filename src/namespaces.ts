import { EmissionMap } from "./emission";
import { HookSet } from "./hooks";

export const rootNS = "/";
export type RootNS = typeof rootNS;

export type Namespaces<T> = Record<string, T>;

export const normalizeNS = (name: string): string => {
  const trimmed = name.trim();
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

// @todo the place for metadata
export interface Namespace<E extends EmissionMap> {
  /**
   * @desc The events that the server can emit
   * @default {}
   * */
  emission: E;
  /**
   * @desc Handlers for some events in different contexts
   * @default {}
   * */
  hooks: HookSet<E>;
}
