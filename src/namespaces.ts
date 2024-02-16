import { clone } from "ramda";

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
  return trimmed.startsWith(rootNS) ? trimmed : `/${trimmed}`;
};
