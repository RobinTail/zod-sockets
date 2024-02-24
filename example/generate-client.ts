import { writeFile } from "node:fs/promises";
import { Integration } from "../src/integration";
import { config } from "./config";

await writeFile(
  "example/example-client.yaml",
  new Integration({ config }).print(),
  "utf-8",
);
