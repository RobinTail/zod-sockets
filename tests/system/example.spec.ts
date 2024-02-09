import { spawn } from "node:child_process";
import { afterAll, describe, expect, test, vi } from "vitest";
import { io } from "socket.io-client";
import { z } from "zod";
import { waitFor } from "../helpers";

describe("System test on Example", async () => {
  let out = "";
  const listener = (chunk: Buffer) => {
    out += chunk.toString();
  };

  const example = spawn("tsx", ["index.ts"], {
    cwd: "./example",
  });
  example.stdout.on("data", listener);
  await waitFor(() => out.indexOf("ZOD-SOCKETS") > -1);
  const client = io("ws://localhost:8090");
  await waitFor(() => client.connected);

  afterAll(async () => {
    client.disconnect();
    example.stdout.removeListener("data", listener);
    example.kill();
    await waitFor(() => example.killed);
  });

  describe("ping", () => {
    test("should ack. pong with echo", async () => {
      const ack = vi.fn((...response) => {
        expect(response).toEqual(["pong", "test"]);
      });
      client.emit("ping", "test", ack);
      await waitFor(() => ack.mock.calls.length === 1);
    });
  });

  describe("subscribe", () => {
    test("should receive time events every second", async () => {
      const onTime = vi.fn((...response) => {
        expect(response).toEqual([expect.any(String)]);
        expect(
          z.string().datetime().safeParse(response[0]).success,
        ).toBeTruthy();
      });
      client.on("time", onTime);
      client.emit("subscribe");
      await waitFor(() => onTime.mock.calls.length > 1);
      client.off("time", onTime);
    });
  });
});
