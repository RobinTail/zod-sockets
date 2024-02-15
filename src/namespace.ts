import { clone } from "ramda";
import { isEmission } from "./emission";

export type SomeNamespaces<T> = Record<string, T>;

export const ensureNamespaces = <T extends object>(
  subject: T | SomeNamespaces<T>,
): SomeNamespaces<T> => {
  const copy = clone(subject) as SomeNamespaces<T>;
  for (const [key, value] of Object.entries(copy)) {
    if (isEmission(value)) {
      copy["/"] = { ...copy["/"], [key]: value };
      delete copy[key];
    }
  }
  return copy;
};
