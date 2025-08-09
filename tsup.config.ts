import { defineConfig } from "tsup";
import { name, version, engines } from "./package.json";
import semver from "semver";

const minNode = semver.minVersion(engines.node)!;

export default defineConfig({
  name,
  entry: ["src/index.ts"],
  format: "esm",
  splitting: false,
  sourcemap: false,
  clean: true,
  dts: true,
  minify: true,
  target: `node${minNode.major}.${minNode.minor}.${minNode.patch}`,
  removeNodeProtocol: false, // @todo will be default in v9
  esbuildOptions: (options, { format }) => {
    options.define = {
      "process.env.TSUP_BUILD": `"v${version} (${format.toUpperCase()})"`,
    };
  },
});
