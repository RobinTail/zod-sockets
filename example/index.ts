import http from "node:http";
import { attachSockets } from "zod-sockets";
import { actions } from "./actions";
import { config } from "./config";
import { Server } from "socket.io";
import { givePort } from "../tools/ports";

attachSockets({
  io: new Server(),
  target: http.createServer().listen(givePort("example")),
  config,
  actions,
});
