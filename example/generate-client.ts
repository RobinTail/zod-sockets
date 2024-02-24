import { writeFile } from "node:fs/promises";
import { Integration } from "../src/integration";
import { config } from "./config";

await writeFile(
  "example/example-client.ts",
  new Integration({ config }).print(),
  "utf-8",
);
