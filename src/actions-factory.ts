import { z } from "zod";
import { Action, Handler } from "./action";
import { Config } from "./config";
import { EmissionMap } from "./emission";
import { Metadata } from "./metadata";

export interface ActionNoAckDef<
  IN extends z.AnyZodTuple,
  E extends EmissionMap,
  D extends Metadata,
> {
  /** @desc The incoming event payload validation schema (no acknowledgement) */
  input: IN;
  /** @desc No output schema => no returns => no acknowledgement */
  handler: Handler<z.output<IN>, void, E, D>;
}

export interface ActionWithAckDef<
  IN extends z.AnyZodTuple,
  OUT extends z.AnyZodTuple,
  E extends EmissionMap,
  D extends Metadata,
> {
  /** @desc The incoming event payload (excl. acknowledgement) validation schema */
  input: IN;
  /** @desc The acknowledgement validation schema */
  output: OUT;
  /** @desc The returns become an Acknowledgement */
  handler: Handler<z.output<IN>, z.input<OUT>, E, D>;
}

export class ActionsFactory<E extends EmissionMap, D extends Metadata> {
  constructor(protected config: Config<E, D>) {}

  public build<IN extends z.AnyZodTuple, OUT extends z.AnyZodTuple>(
    def: ActionNoAckDef<IN, E, D> | ActionWithAckDef<IN, OUT, E, D>,
  ): Action<IN, OUT> {
    return new Action(def);
  }
}
