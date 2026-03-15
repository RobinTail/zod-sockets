import { z } from "zod";
import { ActionsFactory } from "./actions-factory";
import { createSimpleConfig } from "./config";
import { Integration } from "./integration";

describe("Integration", () => {
  const sampleConfig = createSimpleConfig();

  describe("print()", () => {
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
          new ActionsFactory(sampleConfig).build({
            event: "test",
            input,
            handler: vi.fn(),
          }),
        ],
      });
      expect(instance.print()).toMatchSnapshot();
    });
  });
});
