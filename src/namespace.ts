import { clone } from "ramda";

export type SomeNamespaces<T> = Record<string, T>;

/** @desc moves items into a root namespace (immutable) */
export const ensureNamespaces = <T extends object>(
  subject: T | SomeNamespaces<T>,
  /** @desc which ones to move into a namespace */
  check: (value: unknown) => boolean,
): SomeNamespaces<T> => {
  const copy = clone(subject) as SomeNamespaces<T>;
  for (const [key, value] of Object.entries(copy)) {
    if (check(value)) {
      copy["/"] = { ...copy["/"], [key]: value };
      delete copy[key];
    }
  }
  return copy;
};
