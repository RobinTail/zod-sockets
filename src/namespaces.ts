import { clone } from "ramda";
import { EmissionMap } from "./emission";
import { HookSet } from "./hooks";

export const rootNS = "/";
export type RootNS = typeof rootNS;

export type Namespaces<T> = Record<string, T>;

/** @desc moves items into a root namespace (immutable) */
export const ensureNamespaces = <T extends object>(
  subject: T | Namespaces<T>,
  /** @desc which ones to move into a namespace */
  check: (value: unknown) => boolean,
): Namespaces<T> => {
  const copy = clone(subject) as Namespaces<T>;
  for (const [key, value] of Object.entries(copy)) {
    if (check(value)) {
      copy[rootNS] = { ...copy[rootNS], [key]: value };
      delete copy[key];
    }
  }
  return copy;
};

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
