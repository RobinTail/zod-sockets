import { spawn } from "node:child_process";
import { waitFor } from "../tools/helpers";

describe("CJS Test", () => {
  let out = "";
  const listener = (chunk: Buffer) => {
    out += chunk.toString();
  };
  const quickStart = spawn("unrun", ["quick-start.ts"]);
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
