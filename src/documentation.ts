import { z } from "zod";
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
  depictMessage,
  depictOperation,
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

export class Documentation extends AsyncApiBuilder {
  #makeChannelBinding(): WS.Channel {
    const commons = { onEach, onMissing, rules: depicters };
    return {
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
  }

  public constructor({
    actions,
    config: { namespaces, security: serverSecurity },
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
    const serverSecurityIds: string[] = [];
    for (const [index, schema] of Object.entries(serverSecurity)) {
      const id = lcFirst(makeCleanId(`server security ${index}`));
      this.addSecurityScheme(id, schema);
      serverSecurityIds.push(id);
    }
    for (const server in servers) {
      const uri = new URL(servers[server].url);
      this.addServer(server, {
        description: servers[server].description,
        host: uri.host,
        pathname: uri.pathname,
        protocol: uri.protocol.slice(0, -1),
        security: serverSecurityIds.length
          ? serverSecurityIds.map((id) => ({
              $ref: `#/components/securitySchemes/${id}`,
            }))
          : undefined,
      });
      if (!this.document.id) {
        this.document.id = `urn:${uri.host.split(".").concat(uri.pathname.slice(1).split("/")).join(":")}`;
      }
    }
    const channelBinding = this.#makeChannelBinding();
    for (const [
      dirty,
      { emission, examples, security: nsSecurity = [] },
    ] of Object.entries(namespaces)) {
      const ns = normalizeNS(dirty);
      const channelId = makeCleanId(ns) || "Root";
      const messages: MessagesObject = {};
      const nsSecurityIds: string[] = [];
      for (const [index, schema] of Object.entries(nsSecurity)) {
        const id = lcFirst(makeCleanId(`${channelId} security ${index}`));
        this.addSecurityScheme(id, schema);
        nsSecurityIds.push(id);
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
          direction: "out",
          examples: getEmissionExamples(event, "payload", examples),
        });
        if (ack) {
          messages[ackId] = depictMessage({
            event,
            schema: ack,
            examples: getEmissionExamples(event, "ack", examples),
            direction: "in",
            isAck: true,
          });
        }
        this.addOperation(
          makeCleanId(`${channelId} send operation ${event}`),
          depictOperation({
            direction: "out",
            event,
            channelId,
            messageId,
            ackId: ack && ackId,
            ns,
            // @todo perhaps not applicable
            securityIds: nsSecurityIds,
          }),
        );
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
          messages[messageId] = depictMessage({
            event,
            schema: action.getSchema("input"),
            examples: action.getExamples("input"),
            direction: "in",
          });
          if (output) {
            messages[ackId] = depictMessage({
              event,
              schema: output,
              examples: action.getExamples("output"),
              direction: "out",
              isAck: true,
            });
          }
          this.addOperation(
            makeCleanId(`${channelId} recv operation ${event}`),
            depictOperation({
              direction: "in",
              channelId,
              messageId,
              event,
              ns,
              ackId: output && ackId,
              securityIds: nsSecurityIds,
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
