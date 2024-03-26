import type {
  InfoObject,
  ReferenceObject,
  SchemaObject,
  ServerObject,
  ServerVariableObject,
} from "openapi3-ts/oas31";
import {
  SocketIOChannelBinding,
  SocketIOMessageBinding,
  SocketIOOperationBinding,
  SocketIOServerBinding,
} from "./socket-io-binding";

export type Protocol = "socket.io";

export interface AsyncServerObject extends Omit<ServerObject, "variables"> {
  variables?: Record<string, AsyncServerVariableObject>;
  protocol: Protocol;
  protocolVersion?: string;
  security?: SecurityObject[];
  bindings?: { [P in Protocol]?: SocketIOServerBinding };
}

export interface AsyncApiDocument {
  asyncapi: string;
  /** @desc URI or URN format */
  id?: string;
  info: InfoObject;
  servers?: Record<string, AsyncServerObject>;
  channels: AsyncChannelsObject;
  components?: AsyncComponentsObject;
  tags?: AsyncTagObject[];
  externalDocs?: ExternalDocumentationObject;
  defaultContentType?: string;
}

export type AsyncChannelsObject = Record<string, AsyncChannelObject>;
export interface AsyncChannelObject {
  description?: string;
  /** @desc the messages produced by the application and sent to the channel. */
  subscribe?: AsyncOperationObject;
  /** @desc the messages consumed by the application from the channel. */
  publish?: AsyncOperationObject;
  /** @desc Describes a map of parameters included in a channel name. */
  parameters?: Record<string, ParameterObject>;
  /** @desc Map describing protocol-specific definitions for a channel. */
  bindings?: { [P in Protocol]?: SocketIOChannelBinding };
}

export interface AsyncServerVariableObject extends ServerVariableObject {
  examples?: string[];
}

export type SecurityObject = Record<string, string[]>;

export interface AsyncComponentsObject {
  schemas?: Record<string, SchemaObject>;
  messages?: Record<string, AsyncMessageObject>;
  securitySchemes?: Record<string, AsyncSecuritySchemeObject>;
  parameters?: Record<string, ParameterObject>;
  correlationIds?: Record<string, AsyncCorrelationObject>;
  operationTraits?: Record<string, AsyncOperationTraitObject>;
  messageTraits?: Record<string, AsyncMessageTraitObject>;
  serverBindings?: { [P in Protocol]?: SocketIOServerBinding };
  channelBindings?: { [P in Protocol]?: SocketIOChannelBinding };
  operationBindings?: { [P in Protocol]?: SocketIOOperationBinding };
  messageBindings?: { [P in Protocol]?: SocketIOMessageBinding };
}

export interface AsyncMessageObject extends AsyncMessageTraitObject {
  payload?: SchemaObject | ReferenceObject;
}

export type MessageType = AsyncMessageObject | ReferenceObject;
export interface OneOfMessageType {
  oneOf: MessageType[];
}

export type AsyncOperationMessage = OneOfMessageType | MessageType;

export interface AsyncOperationObject {
  /** @desc Unique string used to identify the operation. */
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: AsyncTagObject[];
  externalDocs?: ExternalDocumentationObject;
  bindings?: { [P in Protocol]?: SocketIOOperationBinding };
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
  bindings?: { [P in Protocol]?: SocketIOOperationBinding };
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
  bindings?: { [P in Protocol]?: SocketIOMessageBinding };
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

export interface ExternalDocumentationObject {
  description?: string;
  url: string;
}
