import { z } from "zod";
import { Action, Handler } from "./action";
import { Config } from "./config";
import { EmissionMap } from "./emission";

export interface ActionNoAckDef<
  IN extends z.AnyZodTuple,
  E extends EmissionMap,
> {
  input: IN;
  handler: Handler<z.output<IN>, void, E>;
}

export interface ActionWithAckDef<
  IN extends z.AnyZodTuple,
  OUT extends z.AnyZodTuple,
  E extends EmissionMap,
> {
  input: IN;
  output: OUT;
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
