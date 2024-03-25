import http from "node:http";
import { attachSockets } from "../src";
import { actions } from "./actions";
import { config } from "./config";
import { Server } from "socket.io";

attachSockets({
  io: new Server(),
  target: http.createServer().listen(8090),
  config,
  actions,
});
