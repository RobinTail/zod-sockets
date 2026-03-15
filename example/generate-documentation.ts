import { writeFile } from "node:fs/promises";
import { Documentation } from "zod-sockets";
import { actions } from "./actions";
import { config } from "./config";
import manifest from "../zod-sockets/package.json";

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
