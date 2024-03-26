import { writeFile } from "node:fs/promises";
import { Documentation } from "../src/documentation";
import { actions } from "./actions";
import { config } from "./config";
import manifest from "../package.json";

await writeFile(
  "example/example-documentation.yaml",
  new Documentation({
    version: manifest.version,
    title: "Example API",
    description: "AsyncAPI documentation example",
    contact: manifest.author,
    license: { name: manifest.license },
    servers: { example: { url: "ws://example.com" } },
    config,
    actions,
  }).getSpecAsYaml(),
  "utf-8",
);
