interface ClassConstructor<T> extends Function {
  new (...args: any[]): T;
}

export type AsyncOperationPayload =
  | ClassConstructor<unknown>
  | Function
  | [Function]
  | string;
