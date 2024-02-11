import { spawn } from "node:child_process";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { waitFor } from "../helpers";

describe("Express Zod API compatibility test", () => {
  let out = "";
  const listener = (chunk: Buffer) => {
    out += chunk.toString();
  };
  const integration = spawn("tsx", ["express-zod-api.ts"], {
    cwd: "./tests/compat",
  });
  integration.stdout.on("data", listener);
  integration.stderr.on("data", listener);

  beforeAll(async () => {
    await waitFor(() => out.indexOf("Listening") > -1);
  });

  afterEach(() => {
    console.log(out);
    out = "";
  });

  afterAll(async () => {
    integration.stdout.removeListener("data", listener);
    integration.stderr.removeListener("data", listener);
    integration.kill();
    await waitFor(() => integration.killed);
  });

  test("Should serve the FE client", async () => {
    const response = await fetch(
      "http://localhost:8090/socket.io/socket.io.min.js",
    );
    expect(response.ok).toBeTruthy();
    expect(response.status).toBe(200);
    const js = await response.text();
    expect(js).toMatch(/Socket.IO v4\.\d\.\d/);
  });
});
