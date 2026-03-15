import {
  AsyncApiObject,
  ChannelObject,
  OperationObject,
  ReferenceObject,
  SchemaObject,
  ServerObject,
} from "./model";
import yaml from "yaml";
import { SecuritySchemeObject } from "./security";

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

  public addSecurityScheme(name: string, schema: SecuritySchemeObject): this {
    this.document.components = {
      ...this.document.components,
      securitySchemes: {
        ...this.document.components?.securitySchemes,
        [name]: schema,
      },
    };
    return this;
  }

  public addSchema(name: string, schema: SchemaObject | ReferenceObject): this {
    this.document.components = {
      ...this.document.components,
      schemas: {
        ...this.document.components?.schemas,
        [name]: schema,
      },
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
