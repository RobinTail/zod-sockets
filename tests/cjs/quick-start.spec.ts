import { spawn } from "node:child_process";

describe("CJS Test", async () => {
  const { waitFor } = await import("../helpers.js");
  let out = "";
  const listener = (chunk: Buffer) => {
    out += chunk.toString();
  };
  const quickStart = spawn("tsx", ["quick-start.ts"], {
    cwd: "./tests/cjs",
  });
  quickStart.stdout.on("data", listener);
  quickStart.stderr.on("data", listener);

  afterAll(async () => {
    quickStart.stdout.removeListener("data", listener);
    quickStart.stderr.removeListener("data", listener);
    quickStart.kill();
    await waitFor(() => quickStart.killed);
  });

  afterEach(() => {
    console.log(out);
    out = "";
  });

  describe("Quick Start from Readme", () => {
    test("should start", async () => {
      await waitFor(() => out.indexOf("Listening") > -1);
    });
  });
});
