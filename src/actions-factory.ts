import { z } from "zod";
import { Action } from "./action";
import { Config } from "./config";
import { ActionContext, Handler } from "./handler";
import { Namespaces, RootNS } from "./namespace";

interface Commons<
  IN extends z.AnyZodTuple,
  NS extends Namespaces,
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
  NS extends Namespaces,
  K extends keyof NS,
> extends Commons<IN, NS, K> {
  /** @desc No output schema => no returns => no acknowledgement */
  handler: Handler<
    ActionContext<z.output<IN>, NS[K]["emission"], NS[K]["metadata"]>,
    void
  >;
}

export interface ActionWithAckDef<
  IN extends z.AnyZodTuple,
  OUT extends z.AnyZodTuple,
  NS extends Namespaces,
  K extends keyof NS,
> extends Commons<IN, NS, K> {
  /** @desc The acknowledgement validation schema */
  output: OUT;
  /** @desc The returns become an Acknowledgement */
  handler: Handler<
    ActionContext<z.output<IN>, NS[K]["emission"], NS[K]["metadata"]>,
    z.input<OUT>
  >;
}

export class ActionsFactory<NS extends Namespaces> {
  constructor(protected config: Config<NS>) {}

  public build<
    IN extends z.AnyZodTuple,
    OUT extends z.AnyZodTuple | undefined = undefined,
    K extends keyof NS = RootNS,
  >(
    def:
      | ActionNoAckDef<IN, NS, K>
      | ActionWithAckDef<IN, NonNullable<OUT>, NS, K>,
  ): Action<NS, IN, OUT> {
    return new Action(def);
  }
}
