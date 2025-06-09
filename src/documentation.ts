import { z } from "zod/v4";
import { AbstractAction } from "./action";
import {
  ContactObject,
  LicenseObject,
  MessagesObject,
} from "./async-api/model";
import { AsyncApiBuilder } from "./async-api/builder";
import { WS } from "./async-api/websockets";
import { lcFirst, makeCleanId } from "./common-helpers";
import { Config } from "./config";
import {
  depictProtocolFeatures,
  depictMessage,
  depictOperation,
} from "./documentation-helpers";
import { Namespaces, normalizeNS } from "./namespace";

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

export class Documentation extends AsyncApiBuilder {
  #makeChannelBinding(): WS.Channel {
    return {
      bindingVersion: "0.1.0",
      method: "GET",
      headers: depictProtocolFeatures({
        connection: z.literal("Upgrade").optional(),
        upgrade: z.literal("websocket").optional(),
      }),
      query: depictProtocolFeatures(
        {
          EIO: z.literal("4").describe("The version of the protocol"),
          transport: z
            .enum(["polling", "websocket"])
            .describe("The name of the transport"),
          sid: z.string().optional().describe("The session identifier"),
        },
        {
          externalDocs: {
            description: "Engine.IO Protocol",
            url: "https://socket.io/docs/v4/engine-io-protocol/",
          },
        },
      ),
    };
  }

  public constructor({
    actions,
    config: { namespaces, security: globalSecurity },
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
    const globalSecurityIds: string[] = [];
    for (const [index, schema] of Object.entries(globalSecurity)) {
      const id = lcFirst(makeCleanId(`server security ${index}`));
      this.addSecurityScheme(id, schema);
      globalSecurityIds.push(id);
    }
    for (const server in servers) {
      const uri = new URL(servers[server].url);
      this.addServer(server, {
        description: servers[server].description,
        host: uri.host,
        pathname: uri.pathname,
        protocol: uri.protocol.slice(0, -1),
        security: globalSecurityIds.length
          ? globalSecurityIds.map((id) => ({
              $ref: `#/components/securitySchemes/${id}`,
            }))
          : undefined,
      });
      if (!this.document.id) {
        this.document.id = `urn:${uri.host.split(".").concat(uri.pathname.slice(1).split("/")).join(":")}`;
      }
    }
    const channelBinding = this.#makeChannelBinding();
    for (const [dirty, { emission, security }] of Object.entries(namespaces)) {
      const ns = normalizeNS(dirty);
      const channelId = makeCleanId(ns) || "Root";
      const messages: MessagesObject = {};
      const securityIds: string[] = [];
      for (const [index, schema] of Object.entries(security)) {
        const id = lcFirst(makeCleanId(`${channelId} security ${index}`));
        this.addSecurityScheme(id, schema);
        securityIds.push(id);
      }
      for (const [event, { schema, ack }] of Object.entries(emission)) {
        const messageId = lcFirst(
          makeCleanId(`${channelId} outgoing ${event}`),
        );
        const ackId = lcFirst(
          makeCleanId(`${channelId} ack for outgoing ${event}`),
        );
        messages[messageId] = depictMessage({
          event,
          schema,
          isResponse: true,
        });
        if (ack) {
          messages[ackId] = depictMessage({
            event,
            schema: ack,
            isResponse: false,
            isAck: true,
          });
        }
        this.addOperation(
          makeCleanId(`${channelId} send operation ${event}`),
          depictOperation({
            isResponse: true,
            event,
            channelId,
            messageId,
            ackId: ack && ackId,
            ns,
          }),
        );
      }
      for (const action of actions) {
        if (action.namespace === ns) {
          const { event, inputSchema, outputSchema } = action;
          const messageId = lcFirst(
            makeCleanId(`${channelId} incoming ${event}`),
          );
          const ackId = lcFirst(
            makeCleanId(`${channelId} ack for incoming ${event}`),
          );
          messages[messageId] = depictMessage({
            event,
            schema: inputSchema,
            isResponse: false,
          });
          if (outputSchema) {
            messages[ackId] = depictMessage({
              event,
              schema: outputSchema,
              isResponse: true,
              isAck: true,
            });
          }
          this.addOperation(
            makeCleanId(`${channelId} recv operation ${event}`),
            depictOperation({
              isResponse: false,
              channelId,
              messageId,
              event,
              ns,
              ackId: outputSchema && ackId,
              securityIds: securityIds,
            }),
          );
        }
      }
      this.addChannel(channelId, {
        address: ns,
        title: `Namespace ${ns}`,
        bindings: { ws: channelBinding },
        messages,
      });
    }
  }
}
