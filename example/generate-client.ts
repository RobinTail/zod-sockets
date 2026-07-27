import { writeFile } from "node:fs/promises";
import { Integration } from "zod-sockets/integration";
import { actions } from "./actions/index.ts";
import { config } from "./config.ts";

await writeFile(
  "example-client.ts",
  new Integration({ config, actions }).print(),
  "utf-8",
);
