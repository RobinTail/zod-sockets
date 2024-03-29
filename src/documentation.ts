import { ContactObject, LicenseObject } from "openapi3-ts/oas31";
import { z } from "zod";
import { AbstractAction } from "./action";
import { ChannelObject, MessagesObject } from "./async-api/commons";
import { AsyncApiBuilder } from "./async-api/document-builder";
import { WSChannelBinding } from "./async-api/ws-binding";
import { lcFirst, makeCleanId } from "./common-helpers";
import { Config } from "./config";
import {
  depictMessage,
  depicters,
  onEach,
  onMissing,
} from "./documentation-helpers";
import { Emission } from "./emission";
import { Example, Namespaces, normalizeNS } from "./namespace";
import { walkSchema } from "./schema-walker";

interface DocumentationParams {
  title: string;
  version: string;
  documentId?: string;
  description?: string;
  contact?: ContactObject;
  license?: LicenseObject;
  servers?: Record<string, { url: string; description?: string }>;
  actions: AbstractAction[];
  config: Config<Namespaces>;
}

const getEmissionExamples = <T extends Example<Emission>, V extends keyof T>(
  event: string,
  variant: V,
  nsExamples?: { [K in string]?: T | T[] },
): NonNullable<T[V]>[] | undefined => {
  const eventExamples = nsExamples?.[event];
  return (
    eventExamples &&
    (Array.isArray(eventExamples) ? eventExamples : [eventExamples])
      .map((example) => example[variant])
      .filter((value): value is NonNullable<typeof value> => !!value)
  );
};

const commons = { onEach, onMissing, rules: depicters };
const channelBinding: WSChannelBinding = {
  bindingVersion: "0.1.0",
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
        EIO: z.literal("4").describe("The version of the protocol"),
        transport: z
          .enum(["polling", "websocket"])
          .describe("The name of the transport"),
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
      const uri = new URL(servers[server].url);
      this.addServer(server, {
        description: servers[server].description,
        host: uri.host,
        pathname: uri.pathname,
        protocol: uri.protocol.slice(0, -1),
      });
      if (!this.document.id) {
        this.document.id = `urn:${uri.host.split(".").concat(uri.pathname.slice(1).split("/")).join(":")}`;
      }
    }
    for (const [ns, { emission, examples }] of Object.entries(namespaces)) {
      const channelId = makeCleanId(normalizeNS(ns)) || "Root";
      const messages: MessagesObject = {};
      for (const [event, { schema, ack }] of Object.entries(emission)) {
        const messageId = lcFirst(
          makeCleanId(`${channelId} outgoing ${event}`),
        );
        const ackId = lcFirst(
          makeCleanId(`${channelId} ack for outgoing ${event}`),
        );
        const payloadExamples = getEmissionExamples(event, "payload", examples);
        messages[messageId] = depictMessage({
          event,
          schema,
          direction: "out",
          examples: payloadExamples,
        });
        if (ack) {
          const ackExamples = getEmissionExamples(event, "ack", examples);
          messages[ackId] = depictMessage({
            event,
            schema: ack,
            examples: ackExamples,
            direction: "in",
            isAck: true,
          });
        }
        const sendOperationId = makeCleanId(
          `${channelId} send operation ${event}`,
        );
        this.addOperation(sendOperationId, {
          action: "send",
          channel: { $ref: `#/channels/${channelId}` },
          messages: [{ $ref: `#/channels/${channelId}/messages/${messageId}` }],
          title: event,
          summary: `Outgoing event ${event}`,
          description: `The message produced by the application within the ${normalizeNS(ns)} namespace`,
          reply: ack
            ? {
                address: {
                  location: "$message.payload#",
                  description: "Last argument: acknowledgement handler",
                },
                channel: { $ref: `#/channels/${channelId}` },
                messages: [
                  { $ref: `#/channels/${channelId}/messages/${ackId}` },
                ],
              }
            : undefined,
        });
      }
      for (const action of actions) {
        if (action.getNamespace() === ns) {
          const event = action.getEvent();
          const messageId = lcFirst(
            makeCleanId(`${channelId} incoming ${event}`),
          );
          const ackId = lcFirst(
            makeCleanId(`${channelId} ack for incoming ${event}`),
          );
          const output = action.getSchema("output");
          const inputExamples = action.getExamples("input");
          messages[messageId] = depictMessage({
            event,
            schema: action.getSchema("input"),
            examples: inputExamples,
            direction: "in",
          });
          if (output) {
            const outputExamples = action.getExamples("output");
            messages[ackId] = depictMessage({
              event,
              schema: output,
              examples: outputExamples,
              direction: "out",
              isAck: true,
            });
          }
          const recvOperationId = makeCleanId(
            `${channelId} recv operation ${event}`,
          );
          this.addOperation(recvOperationId, {
            action: "receive",
            channel: { $ref: `#/channels/${channelId}` },
            messages: [
              { $ref: `#/channels/${channelId}/messages/${messageId}` },
            ],
            title: event,
            summary: `Incoming event ${event}`,
            description: `The message consumed by the application within the ${normalizeNS(ns)} namespace`,
            reply: output
              ? {
                  address: {
                    location: "$message.payload#",
                    description: "Last argument: acknowledgement handler",
                  },
                  channel: { $ref: `#/channels/${channelId}` },
                  messages: [
                    { $ref: `#/channels/${channelId}/messages/${ackId}` },
                  ],
                }
              : undefined,
          });
        }
      }
      const channel: ChannelObject = {
        address: normalizeNS(ns),
        title: `Namespace ${normalizeNS(ns)}`,
        bindings: { ws: channelBinding },
        messages,
      };
      this.addChannel(channelId, channel);
    }
  }
}
