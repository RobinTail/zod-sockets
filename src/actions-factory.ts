import { z } from "zod";
import { Action } from "./action";
import { Config } from "./config";
import { EmissionMap } from "./emission";
import { ActionContext, Handler } from "./handler";
import { SomeNamespaces } from "./namespace";

export interface ActionNoAckDef<
  IN extends z.AnyZodTuple,
  NS extends SomeNamespaces<EmissionMap>,
  K extends keyof NS,
> {
  ns?: K;
  /** @desc The incoming event payload validation schema (no acknowledgement) */
  input: IN;
  /** @desc No output schema => no returns => no acknowledgement */
  handler: Handler<ActionContext<z.output<IN>, NS[K]>, void>;
}

export interface ActionWithAckDef<
  IN extends z.AnyZodTuple,
  OUT extends z.AnyZodTuple,
  NS extends SomeNamespaces<EmissionMap>,
  K extends keyof NS,
> {
  ns?: K;
  /** @desc The incoming event payload (excl. acknowledgement) validation schema */
  input: IN;
  /** @desc The acknowledgement validation schema */
  output: OUT;
  /** @desc The returns become an Acknowledgement */
  handler: Handler<ActionContext<z.output<IN>, NS[K]>, z.input<OUT>>;
}

export class ActionsFactory<NS extends SomeNamespaces<EmissionMap>> {
  constructor(protected config: Config<NS>) {}

  public build<
    IN extends z.AnyZodTuple,
    OUT extends z.AnyZodTuple,
    K extends keyof NS = "/",
  >(
    def: ActionNoAckDef<IN, NS, K> | ActionWithAckDef<IN, OUT, NS, K>,
  ): Action<IN, OUT> {
    return new Action(def);
  }
}
