import {
  AsyncApiObject,
  ChannelObject,
  OperationObject,
  ServerObject,
} from "./model";
import yaml from "yaml";

export class AsyncApiBuilder {
  protected readonly document: AsyncApiObject;

  constructor(
    initial: Pick<AsyncApiObject, "info" | "id" | "defaultContentType">,
  ) {
    this.document = {
      asyncapi: "3.0.0",
      ...initial,
      servers: {},
      channels: {},
      components: {},
    };
  }

  public addServer(name: string, server: ServerObject): this {
    this.document.servers = { ...this.document.servers, [name]: server };
    return this;
  }

  public addChannel(name: string, channel: ChannelObject): this {
    this.document.channels = { ...this.document.channels, [name]: channel };
    return this;
  }

  public addOperation(name: string, operation: OperationObject): this {
    this.document.operations = {
      ...this.document.operations,
      [name]: operation,
    };
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
