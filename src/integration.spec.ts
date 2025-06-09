import { z } from "zod/v4";
import { actions } from "../example/actions";
import { config } from "../example/config";
import { ActionsFactory } from "./actions-factory";
import { createSimpleConfig } from "./config";
import { Integration } from "./integration";

describe("Integration", () => {
  describe("print()", () => {
    test("should print the example client side types", () => {
      const instance = new Integration({ config, actions });
      expect(instance.print()).toMatchSnapshot();
    });

    test("should handle circular references", () => {
      const feature = z.object({
        title: z.string(),
        get features() {
          return feature.array();
        },
      });
      const input = z.tuple([feature.array()]);
      const instance = new Integration({
        config: createSimpleConfig(),
        actions: [
          new ActionsFactory(config).build({
            event: "test",
            input,
            handler: vi.fn<any>(),
          }),
        ],
      });
      expect(instance.print()).toMatchSnapshot();
    });
  });
});
