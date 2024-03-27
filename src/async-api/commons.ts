import type {
  InfoObject as OASInfoObject,
  ServerVariableObject as OASServerVariableObject,
  ReferenceObject,
  SchemaObject,
} from "openapi3-ts/oas31";
import {
  SocketIOChannelBinding,
  SocketIOMessageBinding,
  SocketIOOperationBinding,
  SocketIOServerBinding,
} from "./socket-io-binding";

/**
 * @fileoverview AsyncAPI specification
 * @version 3.0.0 draft
 */

interface Bindings<T> {
  "socket.io"?: T;
}

/** @since 3.0.0 detached from OAS; added host, pathname, title, description, tags, externalDocs; changed security */
export interface ServerObject {
  host: string;
  protocol: string; // not the same as the Protocol for binding
  protocolVersion?: string;
  pathname?: string;
  title?: string;
  description?: string;
  variables?: Record<string, ServerVariableObject>;
  security?: SecuritySchemeObject[];
  tags?: TagObject[];
  externalDocs?: ExternalDocumentationObject;
  bindings?: Bindings<SocketIOServerBinding>;
}

/** @since 3.0.0 contains tags and externalDocs */
export interface InfoObject extends OASInfoObject {
  tags?: TagObject[];
  externalDocs?: ExternalDocumentationObject;
}

export interface AsyncApiObject {
  asyncapi: string;
  /** @desc URI or URN format */
  id?: string;
  info: InfoObject;
  servers?: Record<string, ServerObject>;
  channels?: ChannelsObject;
  operations?: OperationsObject;
  components?: ComponentsObject;
  defaultContentType?: string;
}

/**
 * @since 3.0.0 An identifier for the described channel. The channelId value is case-sensitive.
 * */
export type ChannelsObject = Record<string, ChannelObject>;

/** @since 3.0.0 renamed; added address, title, summary, messages, servers, tags, externalDocs; removed pubs/subs */
export interface ChannelObject {
  /** @desc Typically the "topic name", "routing key", "event type", or "path". */
  address?: string | null;
  title?: string;
  summary?: string;
  description?: string;
  messages?: MessagesObject;
  servers?: ReferenceObject[];
  /** @desc Describes a map of parameters included in a channel name. */
  parameters?: ParametersObject;
  tags?: TagObject[];
  externalDocs?: ExternalDocumentationObject;
  /** @desc Map describing protocol-specific definitions for a channel. */
  bindings?: Bindings<SocketIOChannelBinding>;
}

export interface ServerVariableObject extends OASServerVariableObject {
  examples?: string[];
}

export interface ComponentsObject {
  schemas?: Record<string, SchemaObject>;
  servers?: Record<string, ServerObject>;
  serverVariables?: Record<string, ServerVariableObject>;
  channels?: Record<string, ChannelObject>;
  messages?: Record<string, MessageObject>;
  securitySchemes?: Record<string, SecuritySchemeObject>;
  parameters?: Record<string, ParameterObject>;
  correlationIds?: Record<string, CorrelationIDObject>;
  operationTraits?: Record<string, OperationTraitObject>;
  messageTraits?: Record<string, MessageTraitObject>;
  serverBindings?: Bindings<SocketIOServerBinding>;
  channelBindings?: Bindings<SocketIOChannelBinding>;
  operationBindings?: Bindings<SocketIOOperationBinding>;
  messageBindings?: Bindings<SocketIOMessageBinding>;
}

export interface MessageObject extends MessageTraitObject {
  payload?: SchemaObject | MultiFormatSchemaObject | ReferenceObject;
  traits?: MessageTraitObject | ReferenceObject;
}

/** @desc The key represents the message identifier. The messageId value is case-sensitive. */
export type MessagesObject = Record<string, MessageObject | ReferenceObject>;

/** @since 3.0.0 added action, channel, messages, reply */
export interface OperationObject extends OperationTraitObject {
  action: "send" | "receive";
  /** @desc A $ref pointer to the definition of the channel in which this operation is performed. */
  channel: ReferenceObject;
  /** @desc A list of $ref pointers pointing to the supported Message Objects that can be processed by this operation */
  messages?: ReferenceObject[];
  // @todo
  reply?: unknown;
  traits?: Record<string, OperationTraitObject>;
}

/**
 * @desc The operation this application MUST implement. The field name (operationId) MUST be a string used to
 * @desc identify the operation in the document where it is defined, and its value is case-sensitive.
 * */
export type OperationsObject = Record<string, OperationObject>;

/** @since 3.0.0 operationId moved to OperationsObject; added title, security */
export interface OperationTraitObject {
  title?: string;
  summary?: string;
  description?: string;
  security?: SecuritySchemeObject[];
  tags?: TagObject[];
  externalDocs?: ExternalDocumentationObject;
  bindings?: Bindings<SocketIOOperationBinding>;
}

/** @since 3.0.0 messageId moved to MessagesObject, schemaFormat moved to MultiFormatSchemaObject */
export interface MessageTraitObject {
  headers?: SchemaObject | MultiFormatSchemaObject;
  correlationId?: CorrelationIDObject;
  contentType?: string;
  name?: string;
  title?: string;
  summary?: string;
  description?: string;
  tags?: TagObject[];
  externalDocs?: ExternalDocumentationObject;
  bindings?: Bindings<SocketIOMessageBinding>;
  // @todo
  examples?: unknown[];
}

/** @since 3.0.0 new */
interface MultiFormatSchemaObject {
  /**
   * @desc A string containing the name of the schema format that is used to define the information.
   * @example application/vnd.aai.asyncapi+yaml;version=3.0.0
   * @example application/schema+yaml;version=draft-07
   * */
  schemaFormat: string;
  schema: SchemaObject;
}

export interface CorrelationIDObject {
  description?: string;
  /**
   * @desc A runtime expression that specifies the location of the correlation ID.
   * @example $message.header#/correlationId
   * */
  location: string;
}

export interface TagObject {
  name: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
}

export interface SecuritySchemeObject {
  type:
    | "userPassword"
    | "apiKey"
    | "X509"
    | "symmetricEncryption"
    | "asymmetricEncryption"
    | "http"
    | "oauth2"
    | "openIdConnect";
  description?: string;
  /** @desc for httpApiKey */
  name?: string;
  /** @desc Valid values are "user" and "password" for apiKey and "query", "header" or "cookie" for httpApiKey. */
  in?: "user" | "password" | "query" | "header" | "cookie";
  /** @desc for http */
  scheme?: string;
  /** @desc for http */
  bearerFormat?: string;
  /** @desc for oauth2 */
  flows?: OAuthFlowsObject;
  /** @desc for openIdConnect */
  openIdConnectUrl?: string;
}

export interface OAuthFlowsObject {
  implicit?: OAuthFlowObject;
  password?: OAuthFlowObject;
  clientCredentials?: OAuthFlowObject;
  authorizationCode?: OAuthFlowObject;
}

export interface OAuthFlowObject {
  /** @desc for implicit and authorizationCode */
  authorizationUrl?: string;
  /** @desc for password, clientCredentials and authorizationCode */
  tokenUrl?: string;
  refreshUrl?: string;
  /** @desc A map between the scope name and a short description for it. */
  scopes: Record<string, string>;
}

/** @since 3.0.0 partially extends SchemaObject; schema prop removed */
export interface ParameterObject
  extends Pick<SchemaObject, "enum" | "default" | "description" | "examples"> {
  /** @desc A runtime expression that specifies the location of the parameter value. */
  location?: string;
}

/** @desc Property pattern ^[A-Za-z0-9_\-]+$ */
export type ParametersObject = Record<string, ParameterObject>;

export interface ExternalDocumentationObject {
  description?: string;
  url: string;
}
