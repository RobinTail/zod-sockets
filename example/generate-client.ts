import { writeFile } from "node:fs/promises";
import { Integration } from "../src/integration";
import { onChat } from "./actions/chat";
import { onPing } from "./actions/ping";
import { onSubscribe } from "./actions/subscribe";
import { config } from "./config";

await writeFile(
  "example/example-client.ts",
  new Integration({ config, actions: [onChat, onPing, onSubscribe] }).print(),
  "utf-8",
);
