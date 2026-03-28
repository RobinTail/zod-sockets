import { defineConfig } from "tsdown";
import { readFile } from "node:fs/promises";

const { version } = JSON.parse(await readFile("./package.json", "utf8"));

export default defineConfig({
  entry: "src/index.ts",
  minify: true,
  fixedExtension: false,
  attw: { profile: "esm-only", level: "error" },
  define: {
    "process.env.TSDOWN_BUILD": `"v${version}"`,
  },
  plugins: [
    {
      name: "fix-dts-rolldown-plugin",
      generateBundle: (_opt, bundle) => {
        for (const [name, file] of Object.entries(bundle)) {
          if (!(name.endsWith(".d.ts") && "code" in file)) continue;
          // rm #private markers (TS6 compatibility)
          file.code = file.code.replaceAll(/#private;\s*/g, "");
        }
      },
    },
  ],
});
