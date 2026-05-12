import { onChat } from "./chat.ts";
import { onPing } from "./ping.ts";
import { onSubscribe } from "./subscribe.ts";
import { onUnsubscribe } from "./unsubscribe.ts";

export const actions = [onChat, onPing, onSubscribe, onUnsubscribe];
