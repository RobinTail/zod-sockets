import { z } from "zod";
import { EmissionMap } from "./emission";
import {
  ClientContext,
  Handler,
  IndependentContext,
  TracingContext,
} from "./handler";

export interface Hooks<E extends EmissionMap, D extends z.SomeZodObject> {
  /** @desc A place for emitting events regardless receiving events */
  onConnection: Handler<ClientContext<E, D>, void>;
  onDisconnect: Handler<ClientContext<E, D>, void>;
  onAnyIncoming: Handler<TracingContext<E, D>, void>;
  onAnyOutgoing: Handler<TracingContext<E, D>, void>;
  /** @desc A place for emitting events regardless clients activity */
  onStartup: Handler<IndependentContext<E, D>, void>;
}
