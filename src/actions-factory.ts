import { z } from "zod";
import { Action } from "./action";
import { Config } from "./config";
import { EmissionMap } from "./emission";
import { Handler } from "./handler";

export interface ActionNoAckDef<
  IN extends z.AnyZodTuple,
  E extends EmissionMap,
> {
  /** @desc The incoming event payload validation schema (no acknowledgement) */
  input: IN;
  /** @desc No output schema => no returns => no acknowledgement */
  handler: Handler<z.output<IN>, void, E>;
}

export interface ActionWithAckDef<
  IN extends z.AnyZodTuple,
  OUT extends z.AnyZodTuple,
  E extends EmissionMap,
> {
  /** @desc The incoming event payload (excl. acknowledgement) validation schema */
  input: IN;
  /** @desc The acknowledgement validation schema */
  output: OUT;
  /** @desc The returns become an Acknowledgement */
  handler: Handler<z.output<IN>, z.input<OUT>, E>;
}

export class ActionsFactory<E extends EmissionMap> {
  constructor(protected config: Config<E>) {}

  public build<IN extends z.AnyZodTuple, OUT extends z.AnyZodTuple>(
    def: ActionNoAckDef<IN, E> | ActionWithAckDef<IN, OUT, E>,
  ): Action<IN, OUT> {
    return new Action(def);
  }
}
