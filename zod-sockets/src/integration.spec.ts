import ts from "typescript";
import { z } from "zod";
import { ActionsFactory } from "./actions-factory";
import { Config, createSimpleConfig } from "./config";
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
        typescript: ts,
        config: sampleConfig,
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

    test("should handle namespaces with emission", async () => {
      const configWithEmission = new Config().addNamespace({
        path: "/test",
        emission: {
          message: {
            schema: z.tuple([z.string()]),
            ack: z.tuple([z.number()]),
          },
        },
      });
      const instance = await Integration.create({
        config: configWithEmission,
        actions: [],
      });
      expect(instance.print()).toMatchSnapshot();
    });
  });
});
