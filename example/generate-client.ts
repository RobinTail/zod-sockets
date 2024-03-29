import { writeFile } from "node:fs/promises";
import { Integration } from "../src";
import { actions } from "./actions";
import { config } from "./config";

await writeFile(
  "example/example-client.ts",
  new Integration({ config, actions }).print(),
  "utf-8",
);
