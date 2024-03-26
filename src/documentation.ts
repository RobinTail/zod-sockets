import { ContactObject, LicenseObject } from "openapi3-ts/oas31";
import { z } from "zod";
import { AbstractAction } from "./action";
import { AsyncApiDocumentBuilder } from "./async-api/document-builder";
import { AsyncChannelObject } from "./async-api/commons";
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

export class Documentation extends AsyncApiDocumentBuilder {
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
    for (const [ns, { emission }] of Object.entries(namespaces)) {
      const channel: AsyncChannelObject = {
        description: `${normalizeNS(ns)} namespace`,
        bindings: {
          "socket.io": {
            bindingVersion: "0.11.0",
            method: "GET",
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
                onEach,
                onMissing,
                rules: depicters,
              }),
              externalDocs: {
                description: "Engine.IO Protocol",
                url: "https://socket.io/docs/v4/engine-io-protocol/",
              },
            },
          },
        },
        subscribe: {
          operationId: `out${normalizeNS(ns)}`,
          description: `The messages produced by the application within the ${normalizeNS(ns)} namespace`,
          message: {
            oneOf: Object.entries(emission).map(([event, { schema, ack }]) => ({
              name: event,
              title: event,
              messageId: `out${normalizeNS(ns)}/${event}`,
              payload: walkSchema({
                direction: "out",
                schema,
                onEach,
                onMissing,
                rules: depicters,
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
                        onEach,
                        onMissing,
                        rules: depicters,
                      }),
                    },
                  }
                : undefined,
            })),
          },
        },
        publish: {
          operationId: `in${normalizeNS(ns)}`,
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
                  messageId: `in${normalizeNS(ns)}/${event}`,
                  payload: walkSchema({
                    direction: "in",
                    schema: action.getSchema("input"),
                    onEach,
                    onMissing,
                    rules: depicters,
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
                            onEach,
                            onMissing,
                            rules: depicters,
                          }),
                        },
                      }
                    : undefined,
                };
              }),
          },
        },
      };
      this.addChannel(ns, channel);
    }
  }
}
