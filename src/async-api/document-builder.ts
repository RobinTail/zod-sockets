import type {
  ExternalDocumentationObject,
  InfoObject,
  SecuritySchemeObject,
  TagObject,
} from "openapi3-ts/oas31";
import { complement, isNil, pickBy } from "ramda";
import {
  AsyncApiDocument,
  AsyncChannelObject,
  AsyncSecuritySchemeObject,
  AsyncServerObject,
} from "./interface";
import yaml from "yaml";

export class AsyncApiDocumentBuilder {
  private readonly document: AsyncApiDocument;

  constructor(info: InfoObject) {
    this.document = {
      asyncapi: "2.5.0",
      info,
      tags: [],
      servers: {},
      channels: {},
      components: {},
    };
  }

  public addServer(name: string, server: AsyncServerObject): this {
    this.document.servers = { ...this.document.servers, [name]: server };
    return this;
  }

  public addServers(
    servers: { name: string; server: AsyncServerObject }[],
  ): this {
    for (const { name, server } of servers) {
      this.addServer(name, server);
    }

    return this;
  }

  public setExternalDoc(description: string, url: string): this {
    this.document.externalDocs = { description, url };
    return this;
  }

  public setDefaultContentType(contentType: string) {
    this.document.defaultContentType = contentType;
    return this;
  }

  public addTag(
    name: string,
    description?: string,
    externalDocs?: ExternalDocumentationObject,
  ): this {
    this.document.tags = [...(this.document.tags || [])].concat(
      pickBy(complement(isNil), {
        name,
        description,
        externalDocs,
      }) satisfies TagObject,
    );
    return this;
  }

  public addSecurity(name: string, options: AsyncSecuritySchemeObject): this {
    this.document.components = {
      ...this.document.components,
      securitySchemes: {
        ...this.document.components?.securitySchemes,
        [name]: options,
      },
    };
    return this;
  }

  public addBearerAuth(
    options: SecuritySchemeObject = {
      type: "http",
    },
    name = "bearer",
  ): this {
    this.addSecurity(name, {
      scheme: "bearer",
      bearerFormat: "JWT",
      ...options,
    });
    return this;
  }

  public addOAuth2(
    options: SecuritySchemeObject = {
      type: "oauth2",
    },
    name = "oauth2",
  ): this {
    this.addSecurity(name, {
      flows: {},
      ...options,
      type: "oauth2",
    });
    return this;
  }

  public addApiKey(
    options: SecuritySchemeObject = {
      type: "apiKey",
    },
    name = "api_key",
  ): this {
    this.addSecurity(name, {
      in: "header",
      name,
      ...options,
      type: "apiKey",
    });
    return this;
  }

  public addBasicAuth(
    options: SecuritySchemeObject = {
      type: "http",
    },
    name = "basic",
  ): this {
    this.addSecurity(name, {
      scheme: "basic",
      ...options,
      type: "http",
    });
    return this;
  }

  public addCookieAuth(
    cookieName = "connect.sid",
    options: SecuritySchemeObject = {
      type: "apiKey",
    },
    securityName = "cookie",
  ): this {
    this.addSecurity(securityName, {
      in: "cookie",
      name: cookieName,
      ...options,
      type: "apiKey",
    });
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
