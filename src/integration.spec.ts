import { describe, expect, test } from "vitest";
import { actions } from "../example/actions";
import { config } from "../example/config";
import { Integration } from "./integration";

describe("Integration", () => {
  describe("print()", () => {
    test("should print the example client side types", () => {
      const instance = new Integration({ config, actions });
      expect(instance.print()).toMatchSnapshot();
    });
  });
});
