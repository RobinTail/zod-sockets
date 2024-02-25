import { EmissionMap } from "./emission";
import {
  ClientContext,
  Handler,
  IndependentContext,
  TracingContext,
} from "./handler";
import { Namespaces } from "./namespaces";

export interface HookSet<E extends EmissionMap, D extends object> {
  /** @desc A place for emitting events regardless receiving events */
  onConnection?: Handler<ClientContext<E, D>, void>;
  onDisconnect?: Handler<ClientContext<E, D>, void>;
  onAnyIncoming?: Handler<TracingContext<E, D>, void>;
  onAnyOutgoing?: Handler<TracingContext<E, D>, void>;
  /** @desc A place for emitting events regardless clients activity */
  onStartup?: Handler<IndependentContext<E>, void>;
}

export type Hooks<NS extends Namespaces<EmissionMap>, D extends object> = {
  [K in keyof NS]?: HookSet<NS[K], D>;
};
