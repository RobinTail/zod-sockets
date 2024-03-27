import type {
  InfoObject,
  ServerObject as OASServerObject,
  ReferenceObject,
  SchemaObject,
  ServerVariableObject,
} from "openapi3-ts/oas31";
import {
  SocketIOChannelBinding,
  SocketIOMessageBinding,
  SocketIOOperationBinding,
  SocketIOServerBinding,
} from "./socket-io-binding";

export type Protocol = "socket.io";

export interface ServerObject extends Omit<OASServerObject, "variables"> {
  variables?: Record<string, AsyncServerVariableObject>;
  protocol: Protocol;
  protocolVersion?: string;
  security?: SecurityObject[];
  bindings?: Record<Protocol, SocketIOServerBinding>;
}

export interface AsyncApiObject {
  asyncapi: string;
  /** @desc URI or URN format */
  id?: string;
  info: InfoObject;
  servers?: Record<string, ServerObject>;
  channels: ChannelsObject;
  components?: AsyncComponentsObject;
  tags?: AsyncTagObject[];
  externalDocs?: ExternalDocumentationObject;
  defaultContentType?: string;
}

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
  bindings?: Record<Protocol, SocketIOChannelBinding>;
}

export interface AsyncServerVariableObject extends ServerVariableObject {
  examples?: string[];
}

export type SecurityObject = Record<string, string[]>;

export interface AsyncComponentsObject {
  schemas?: Record<string, SchemaObject>;
  messages?: Record<string, AsyncMessageObject>;
  securitySchemes?: Record<string, AsyncSecuritySchemeObject>;
  parameters?: ParametersObject;
  correlationIds?: Record<string, AsyncCorrelationObject>;
  operationTraits?: Record<string, AsyncOperationTraitObject>;
  messageTraits?: Record<string, AsyncMessageTraitObject>;
  serverBindings?: Record<Protocol, SocketIOServerBinding>;
  channelBindings?: Record<Protocol, SocketIOChannelBinding>;
  operationBindings?: Record<Protocol, SocketIOOperationBinding>;
  messageBindings?: Record<Protocol, SocketIOMessageBinding>;
}

export interface AsyncMessageObject extends AsyncMessageTraitObject {
  payload?: SchemaObject | ReferenceObject;
}

export type MessageType = AsyncMessageObject | ReferenceObject;

export interface OneOfMessageType {
  oneOf: MessageType[];
}

export type AsyncOperationMessage = OneOfMessageType | MessageType;

export interface OperationObject {
  /** @desc Unique string used to identify the operation. */
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: AsyncTagObject[];
  externalDocs?: ExternalDocumentationObject;
  bindings?: Record<Protocol, SocketIOOperationBinding>;
  traits?: Record<string, AsyncOperationTraitObject>;
  message?: AsyncOperationMessage;
}

export interface AsyncOperationTraitObject {
  /** @desc Unique string used to identify the operation. */
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: AsyncTagObject[];
  externalDocs?: ExternalDocumentationObject;
  bindings?: Record<Protocol, SocketIOOperationBinding>;
}

export interface AsyncMessageTraitObject {
  /** @desc Unique string used to identify the message. The id MUST be unique among all messages described in the API.*/
  messageId?: string;
  headers?: SchemaObject;
  correlationId?: AsyncCorrelationObject;
  schemaFormat?: string;
  contentType?: string;
  name?: string;
  title?: string;
  summary?: string;
  description?: string;
  tags?: AsyncTagObject[];
  externalDocs?: ExternalDocumentationObject;
  bindings?: Record<Protocol, SocketIOMessageBinding>;
}

export interface AsyncCorrelationObject {
  description?: string;
  location: string;
}

export interface AsyncTagObject {
  name: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
}

export interface AsyncSecuritySchemeObject {
  type: SecuritySchemeType;
  description?: string;
  name?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
  flows?: OAuthFlowsObject;
  openIdConnectUrl?: string;
}

export declare type SecuritySchemeType =
  | "userPassword"
  | "apiKey"
  | "X509"
  | "symmetricEncryption"
  | "asymmetricEncryption"
  | "http"
  | "oauth2"
  | "openIdConnect";

export interface OAuthFlowsObject {
  implicit?: OAuthFlowObject;
  password?: OAuthFlowObject;
  clientCredentials?: OAuthFlowObject;
  authorizationCode?: OAuthFlowObject;
}

export interface OAuthFlowObject {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: ScopesObject;
}

export type ScopesObject = Record<string, unknown>;

export interface ParameterObject {
  description?: string;
  schema?: SchemaObject | ReferenceObject;
  location?: string;
}

export type ParametersObject = Record<string, ParameterObject>;

export interface ExternalDocumentationObject {
  description?: string;
  url: string;
}
