import { EmissionMap } from "./emission";
import {
  ClientContext,
  Handler,
  IndependentContext,
  TracingContext,
} from "./handler";
import { Namespaces } from "./namespaces";

export interface HookSet<E extends EmissionMap> {
  /** @desc A place for emitting events regardless receiving events */
  onConnection?: Handler<ClientContext<E>, void>;
  onDisconnect?: Handler<ClientContext<E>, void>;
  onAnyIncoming?: Handler<TracingContext<E>, void>;
  onAnyOutgoing?: Handler<TracingContext<E>, void>;
  /** @desc A place for emitting events regardless clients activity */
  onStartup?: Handler<IndependentContext<E>, void>;
}

// @todo remove
export type Hooks<NS extends Namespaces> = {
  [K in keyof NS]?: HookSet<NS[K]["emission"]>;
};
