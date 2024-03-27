import type {
  InfoObject as OASInfoObject,
  ServerObject as OASServerObject,
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

export interface ServerObject extends Omit<OASServerObject, "variables"> {
  variables?: Record<string, ServerVariableObject>;
  protocol: string; // not the same as the Protocol for binding
  protocolVersion?: string;
  security?: SecurityRequirementObject[];
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
  channels: ChannelsObject;
  components?: ComponentsObject;
  defaultContentType?: string;
}

/**
 * @desc A relative path to an individual channel. The field name MUST be in the form of a RFC 6570 URI template.
 * @desc Query parameters and fragments SHALL NOT be used, instead use bindings to define them.
 * */
export type ChannelsObject = Record<string, ChannelItemObject>;

export interface ChannelItemObject {
  description?: string;
  /** @desc the messages produced by the application and sent to the channel. */
  subscribe?: OperationObject;
  /** @desc the messages consumed by the application from the channel. */
  publish?: OperationObject;
  /** @desc Describes a map of parameters included in a channel name. */
  parameters?: ParametersObject;
  /** @desc Map describing protocol-specific definitions for a channel. */
  bindings?: Bindings<SocketIOChannelBinding>;
}

export interface ServerVariableObject extends OASServerVariableObject {
  examples?: string[];
}

/**
 * @desc Each name MUST correspond to a security scheme which is declared in the Security Schemes under the Components.
 * @desc If the security scheme is of type "oauth2" or "openIdConnect", then the value is a list of scope names.
 * */
export type SecurityRequirementObject = Record<string, string[]>;

export interface ComponentsObject {
  schemas?: Record<string, SchemaObject>;
  servers?: Record<string, ServerObject>;
  serverVariables?: Record<string, ServerVariableObject>;
  channels?: Record<string, ChannelItemObject>;
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
  payload?: SchemaObject | ReferenceObject;
  traits?: MessageTraitObject | ReferenceObject;
}

export interface OperationObject extends OperationTraitObject {
  traits?: Record<string, OperationTraitObject>;
  message?:
    | {
        oneOf: Array<MessageObject | ReferenceObject>;
      }
    | MessageObject
    | ReferenceObject;
}

export interface OperationTraitObject {
  /** @desc Unique string used to identify the operation. */
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: TagObject[];
  externalDocs?: ExternalDocumentationObject;
  bindings?: Bindings<SocketIOOperationBinding>;
}

export interface MessageTraitObject {
  /** @desc Unique string used to identify the message. The id MUST be unique among all messages described in the API.*/
  messageId?: string;
  headers?: SchemaObject;
  correlationId?: CorrelationIDObject;
  schemaFormat?: string;
  contentType?: string;
  name?: string;
  title?: string;
  summary?: string;
  description?: string;
  tags?: TagObject[];
  externalDocs?: ExternalDocumentationObject;
  bindings?: Bindings<SocketIOMessageBinding>;
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

export interface ParameterObject {
  description?: string;
  schema?: SchemaObject | ReferenceObject;
  /** @desc A runtime expression that specifies the location of the parameter value. */
  location?: string;
}

/** @desc Property pattern ^[A-Za-z0-9_\-]+$ */
export type ParametersObject = Record<string, ParameterObject>;

export interface ExternalDocumentationObject {
  description?: string;
  url: string;
}
