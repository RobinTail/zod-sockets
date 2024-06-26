/**
 * @desc Using module augmentation approach you can set the type of the actual logger used
 * @example declare module "zod-sockets" { interface LoggerOverrides extends winston.Logger {} }
 * @link https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
 * */
export interface LoggerOverrides {}

/** @desc You can use any logger compatible with this type. */
export type AbstractLogger = Record<
  "info" | "debug" | "warn" | "error",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- meant to be any for assignment compatibility
  (message: string, meta?: any) => any
> &
  LoggerOverrides;
