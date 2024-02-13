import { EmissionMap } from "./emission";

export interface Namespace<E extends EmissionMap> {
  emission: E;
}

export type SomeNamespaces = Record<string, Namespace<EmissionMap>>;
