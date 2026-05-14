import { writeFile } from "node:fs/promises";
import { Documentation } from "zod-sockets";
import { actions } from "./actions/index.ts";
import { config } from "./config.ts";
import manifest from "../zod-sockets/package.json" with { type: "json" };

await writeFile(
  "example-documentation.yaml",
  new Documentation({
    version: manifest.version,
    title: "Example APP",
    description: "AsyncAPI documentation example",
    contact: manifest.author,
    license: { name: manifest.license },
    servers: { example: { url: "https://example.com/socket.io" } },
    config,
    actions,
  }).getSpecAsYaml(),
  "utf-8",
);
