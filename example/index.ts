import http from "node:http";
import { attachSockets } from "../src";
import { onChat } from "./actions/chat";
import { onPing } from "./actions/ping";
import { onSubscribe } from "./actions/subscribe";
import { config } from "./config";
import { Server } from "socket.io";

attachSockets({
  io: new Server(),
  config,
  target: http.createServer().listen(8090),
  actions: {
    ping: onPing,
    subscribe: onSubscribe,
    chat: onChat,
  },
  onConnection: async ({ client }) => {
    await client.broadcast("chat", `${client.id} entered the chat`, {
      from: client.id,
    });
  },
});
