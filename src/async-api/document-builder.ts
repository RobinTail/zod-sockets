import { AsyncApiDocument, AsyncChannelObject, ServerObject } from "./commons";
import yaml from "yaml";

export class AsyncApiDocumentBuilder {
  protected readonly document: AsyncApiDocument;

  constructor(
    initial: Pick<AsyncApiDocument, "info" | "id" | "defaultContentType">,
  ) {
    this.document = {
      asyncapi: "2.6.0",
      ...initial,
      tags: [],
      servers: {},
      channels: {},
      components: {},
    };
  }

  public addServer(name: string, server: ServerObject): this {
    this.document.servers = { ...this.document.servers, [name]: server };
    return this;
  }

  public addChannel(name: string, channel: AsyncChannelObject): this {
    this.document.channels = { ...this.document.channels, [name]: channel };
    return this;
  }

  getSpec(): AsyncApiDocument {
    return this.document;
  }

  getSpecAsJson(
    replacer?: (key: string, value: unknown) => unknown,
    space?: string | number,
  ): string {
    return JSON.stringify(this.document, replacer, space);
  }

  getSpecAsYaml(): string {
    return yaml.stringify(this.document);
  }
}
