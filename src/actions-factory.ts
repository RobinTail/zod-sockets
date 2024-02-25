import { z } from "zod";
import { Action } from "./action";
import { Config } from "./config";
import { EmissionMap } from "./emission";
import { ActionContext, Handler } from "./handler";
import { Namespaces, RootNS } from "./namespaces";

interface Commons<
  IN extends z.AnyZodTuple,
  NS extends Namespaces<EmissionMap>,
  K extends keyof NS,
> {
  /** @desc The incoming event payload validation schema (without or excluding acknowledgement) */
  input: IN;
  /**
   * @desc The namespace this Action belongs to (optional)
   * @default "/"
   * */
  ns?: K;
  /** @desc The incoming event name */
  event: string;
}

export interface ActionNoAckDef<
  IN extends z.AnyZodTuple,
  NS extends Namespaces<EmissionMap>,
  K extends keyof NS,
  D extends object,
> extends Commons<IN, NS, K> {
  /** @desc No output schema => no returns => no acknowledgement */
  handler: Handler<ActionContext<z.output<IN>, NS[K], D>, void>;
}

export interface ActionWithAckDef<
  IN extends z.AnyZodTuple,
  OUT extends z.AnyZodTuple,
  NS extends Namespaces<EmissionMap>,
  K extends keyof NS,
  D extends object,
> extends Commons<IN, NS, K> {
  /** @desc The acknowledgement validation schema */
  output: OUT;
  /** @desc The returns become an Acknowledgement */
  handler: Handler<ActionContext<z.output<IN>, NS[K], D>, z.input<OUT>>;
}

export class ActionsFactory<
  NS extends Namespaces<EmissionMap>,
  D extends z.SomeZodObject,
> {
  constructor(protected config: Config<NS, D>) {}

  public build<
    IN extends z.AnyZodTuple,
    OUT extends z.AnyZodTuple,
    K extends keyof NS & string = RootNS,
  >(
    def:
      | ActionNoAckDef<IN, NS, K, z.input<D>>
      | ActionWithAckDef<IN, OUT, NS, K, z.infer<D>>,
  ): Action<IN, OUT, z.infer<D>> {
    return new Action(def);
  }
}
