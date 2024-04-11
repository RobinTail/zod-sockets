import { onChat } from "./chat";
import { onPing } from "./ping";
import { onSubscribe } from "./subscribe";
import { onUnsubscribe } from "./unsubscribe";

export const actions = [onChat, onPing, onSubscribe, onUnsubscribe];
