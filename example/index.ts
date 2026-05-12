import http from "node:http";
import { attachSockets } from "zod-sockets";
import { actions } from "./actions/index.ts";
import { config } from "./config.ts";
import { Server } from "socket.io";
import { givePort } from "../tools/ports.ts";

attachSockets({
  io: new Server(),
  target: http.createServer().listen(givePort("example")),
  config,
  actions,
});
