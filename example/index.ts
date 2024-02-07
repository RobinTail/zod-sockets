import http from "node:http";
import { attachSockets } from "../src";
import { onChat } from "./actions/chat";
import { onPing } from "./actions/ping";
import { onSubscribe } from "./actions/subscribe";
import { config } from "./config";
import { Server } from "socket.io";

const target = new http.Server().listen(8090);

attachSockets({
  io: new Server(),
  config,
  target,
  actions: {
    /** @desc the object declares handling rules of the incoming socket.io events */
    ping: onPing,
    subscribe: onSubscribe,
    chat: onChat,
  },
});
