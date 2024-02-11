import { spawn } from "node:child_process";
import { afterAll, afterEach, describe, test } from "vitest";
import { waitFor } from "../helpers";

describe("ESM Test", async () => {
  let out = "";
  const listener = (chunk: Buffer) => {
    out += chunk.toString();
  };
  const quickStart = spawn("tsx", ["quick-start.ts"], {
    cwd: "./tests/esm",
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
