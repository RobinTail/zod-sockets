import { ActionMap } from "../src";
import { onChat } from "./actions/chat";
import { onSubscribe } from "./actions/subscribe";
import { onPing } from "./actions/ping";

/** @desc the object declares handling rules of the incoming socket.io events */
export const actions: ActionMap = {
  ping: onPing,
  subscribe: onSubscribe,
  chat: onChat,
};
