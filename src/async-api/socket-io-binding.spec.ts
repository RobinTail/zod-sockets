import { describe, expect, test } from "vitest";
import { version } from "./socket-io-binding";

describe("Socket.IO binding for AsyncAPI", () => {
  describe("Version", () => {
    test("Should have certain value", () => {
      expect(version).toMatchSnapshot();
    });
  });
});
