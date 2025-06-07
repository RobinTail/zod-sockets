import { describe, expect, test, vi } from "vitest";
import { z } from "zod/v4";
import { actions } from "../example/actions";
import { config } from "../example/config";
import { ActionsFactory } from "./actions-factory";
import { Integration } from "./integration";

describe("Integration", () => {
  describe("print()", () => {
    test("should print the example client side types", () => {
      const instance = new Integration({ config, actions });
      expect(instance.print()).toMatchSnapshot();
    });

    test("should handle circular references", () => {
      const baseFeature = z.object({
        title: z.string(),
      });
      type Feature = z.infer<typeof baseFeature> & {
        features: Feature[];
      };
      const feature: z.ZodType<Feature> = baseFeature.extend({
        features: z.lazy(() => feature.array()),
      });
      const input = z.tuple([feature]);
      const instance = new Integration({
        config,
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
