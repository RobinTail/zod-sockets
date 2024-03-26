import { z } from "zod";
import { AbstractAction } from "./action";
import { AsyncApiDocumentBuilder } from "./async-api/document-builder";
import { AsyncChannelObject } from "./async-api/interface";
import { Config } from "./config";
import { depicters, onEach, onMissing } from "./documentation-helpers";
import { Namespaces, normalizeNS } from "./namespace";
import { walkSchema } from "./schema-walker";

interface DocumentationParams {
  title: string;
  version: string;
  servers?: Record<string, { url: string }>;
  actions: AbstractAction[];
  config: Config<Namespaces>;
}

export class Documentation extends AsyncApiDocumentBuilder {
  public constructor({
    actions,
    config: { namespaces },
    title,
    version,
    servers = {},
  }: DocumentationParams) {
    super({ title, version });
    for (const [ns, { emission }] of Object.entries(namespaces)) {
      for (const server in servers) {
        // @todo wss: move target to Config in order to detect this
        this.addServer(server, { ...servers[server], protocol: "ws" });
      }
      const channel: AsyncChannelObject = {
        description: `${normalizeNS(ns)} namespace`,
        bindings: {
          ws: {
            method: "GET",
            bindingVersion: "0.1.0",
            headers: walkSchema({
              direction: "in",
              schema: z.object({
                connection: z.literal("Upgrade").optional(),
                upgrade: z.literal("websocket").optional(),
              }),
              onEach,
              onMissing,
              rules: depicters,
            }),
            query: walkSchema({
              direction: "in",
              schema: z.object({
                EIO: z.number().int().positive().optional(),
                transport: z.literal("websocket").optional(),
              }),
              onEach,
              onMissing,
              rules: depicters,
            }),
          },
        },
        subscribe: {
          message: {
            oneOf: Object.entries(emission).map(([event, { schema }]) => ({
              name: event,
              messageId: `out${normalizeNS(ns)}/${event}`,
              // @todo use ack
              payload: walkSchema({
                direction: "out",
                schema,
                onEach,
                onMissing,
                rules: depicters,
              }),
            })),
          },
        },
        publish: {
          message: {
            oneOf: actions
              .filter((action) => action.getNamespace() === ns)
              .map((action) => {
                const event = action.getEvent();
                return {
                  name: event,
                  messageId: `in${normalizeNS(ns)}/${event}`,
                  // @todo use ack
                  payload: walkSchema({
                    direction: "in",
                    schema: action.getSchema("input"),
                    onEach,
                    onMissing,
                    rules: depicters,
                  }),
                };
              }),
          },
        },
      };
      this.addChannel(ns, channel);
    }
  }
}
