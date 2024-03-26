import type {
  ExternalDocumentationObject,
  SecuritySchemeObject,
  TagObject,
} from "openapi3-ts/oas31";
import { complement, isNil, pickBy } from "ramda";
import {
  AsyncApiDocument,
  AsyncSecuritySchemeObject,
  AsyncServerObject,
} from "./interface";

export class AsyncApiDocumentBuilder {
  private readonly document: AsyncApiDocument = {
    asyncapi: "2.5.0",
    info: {
      title: "",
      description: "",
      version: "1.0.0",
      contact: {},
    },
    tags: [],
    servers: {},
    channels: {},
    components: {},
  };

  public setTitle(title: string): this {
    this.document.info.title = title;
    return this;
  }

  public setDescription(description: string): this {
    this.document.info.description = description;
    return this;
  }

  public setVersion(version: string): this {
    this.document.info.version = version;
    return this;
  }

  public setTermsOfService(termsOfService: string): this {
    this.document.info.termsOfService = termsOfService;
    return this;
  }

  public setContact(name: string, url: string, email: string): this {
    this.document.info.contact = { name, url, email };
    return this;
  }

  public setLicense(name: string, url: string): this {
    this.document.info.license = { name, url };
    return this;
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

  public build(): AsyncApiDocument {
    return this.document;
  }
}
