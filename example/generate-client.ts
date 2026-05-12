import { writeFile } from "node:fs/promises";
import { Integration } from "zod-sockets";
import { actions } from "./actions/index.ts";
import { config } from "./config.ts";
import typescript from "typescript";

await writeFile(
  "example-client.ts",
  new Integration({ typescript, config, actions }).print(),
  "utf-8",
);
