import http from "node:http";
import { attachSockets } from "../src/sockets";
import { socketsConfig } from "./config";
import { actions } from "./routing";
import { Server } from "socket.io";

const target = new http.Server().listen(8090);

attachSockets({
  io: new Server(),
  config: socketsConfig,
  target,
  actions,
  logger: console,
});
