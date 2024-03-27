import { ContactObject, LicenseObject } from "openapi3-ts/oas31";
import { z } from "zod";
import { AbstractAction } from "./action";
import { AsyncApiBuilder } from "./async-api/document-builder";
import { ChannelItemObject } from "./async-api/commons";
import { SocketIOChannelBinding } from "./async-api/socket-io-binding";
import { lcFirst, makeCleanId } from "./common-helpers";
import { Config } from "./config";
import { depicters, onEach, onMissing } from "./documentation-helpers";
import { Namespaces, normalizeNS } from "./namespace";
import { walkSchema } from "./schema-walker";

interface DocumentationParams {
  title: string;
  version: string;
  documentId?: string;
  description?: string;
  contact?: ContactObject;
  license?: LicenseObject;
  servers?: Record<string, { url: string }>;
  actions: AbstractAction[];
  config: Config<Namespaces>;
}

export class Documentation extends AsyncApiBuilder {
  public constructor({
    actions,
    config: { namespaces },
    title,
    version,
    documentId,
    description,
    contact,
    license,
    servers = {},
  }: DocumentationParams) {
    super({
      info: { title, version, contact, license, description },
      id: documentId,
      defaultContentType: "text/plain",
    });
    for (const server in servers) {
      this.addServer(server, { ...servers[server], protocol: "socket.io" });
      if (!this.document.id) {
        const uri = new URL(servers[server].url.toLowerCase());
        this.document.id = `urn:${uri.host.split(".").concat(uri.pathname.slice(1).split("/")).join(":")}`;
      }
    }
    const commons = { onEach, onMissing, rules: depicters };
    const channelBinding: SocketIOChannelBinding = {
      bindingVersion: "0.11.0",
      method: "GET",
      headers: walkSchema({
        direction: "in",
        schema: z.object({
          connection: z.literal("Upgrade").optional(),
          upgrade: z.literal("websocket").optional(),
        }),
        ...commons,
      }),
      query: {
        ...walkSchema({
          direction: "in",
          schema: z.object({
            EIO: z
              .literal("4")
              .describe("Mandatory, the version of the protocol"),
            transport: z
              .union([z.literal("polling"), z.literal("websocket")])
              .describe("Mandatory, the name of the transport."),
            sid: z.string().optional().describe("The session identifier"),
          }),
          ...commons,
        }),
        externalDocs: {
          description: "Engine.IO Protocol",
          url: "https://socket.io/docs/v4/engine-io-protocol/",
        },
      },
    };

    for (const [ns, { emission }] of Object.entries(namespaces)) {
      const channelId = makeCleanId(normalizeNS(ns)) || "Root";
      const channel: ChannelItemObject = {
        description: `Namespace ${normalizeNS(ns)}`,
        bindings: { "socket.io": channelBinding },
        subscribe: {
          operationId: makeCleanId(`outgoing events ${channelId}`),
          description: `The messages produced by the application within the ${normalizeNS(ns)} namespace`,
          message: {
            oneOf: Object.entries(emission).map(([event, { schema, ack }]) => ({
              name: event,
              title: event,
              messageId: lcFirst(makeCleanId(`${channelId} outgoing ${event}`)),
              payload: walkSchema({
                direction: "out",
                schema,
                ...commons,
              }),
              bindings: ack
                ? {
                    "socket.io": {
                      bindingVersion: "0.11.0",
                      ack: walkSchema({
                        direction: "in",
                        schema: ack.describe(
                          ack.description || "Acknowledgement",
                        ),
                        ...commons,
                      }),
                    },
                  }
                : undefined,
            })),
          },
        },
        publish: {
          operationId: makeCleanId(`incoming events ${channelId}`),
          description: `The messages consumed by the application within the ${normalizeNS(ns)} namespace`,
          message: {
            oneOf: actions
              .filter((action) => action.getNamespace() === ns)
              .map((action) => {
                const event = action.getEvent();
                const output = action.getSchema("output");
                return {
                  name: event,
                  title: event,
                  messageId: lcFirst(
                    makeCleanId(`${channelId} incoming ${event}`),
                  ),
                  payload: walkSchema({
                    direction: "in",
                    schema: action.getSchema("input"),
                    ...commons,
                  }),
                  bindings: output
                    ? {
                        "socket.io": {
                          bindingVersion: "0.11.0",
                          ack: walkSchema({
                            direction: "out",
                            schema: output.describe(
                              output.description || "Acknowledgement",
                            ),
                            ...commons,
                          }),
                        },
                      }
                    : undefined,
                };
              }),
          },
        },
      };
      this.addChannel(channelId, channel);
    }
  }
}
