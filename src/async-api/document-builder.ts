import { AsyncApiObject, ChannelItemObject, ServerObject } from "./commons";
import yaml from "yaml";

export class AsyncApiBuilder {
  protected readonly document: AsyncApiObject;

  constructor(
    initial: Pick<AsyncApiObject, "info" | "id" | "defaultContentType">,
  ) {
    this.document = {
      asyncapi: "3.0.0",
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

  public addChannel(name: string, channel: ChannelItemObject): this {
    this.document.channels = { ...this.document.channels, [name]: channel };
    return this;
  }

  getSpec(): AsyncApiObject {
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
