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

export type Protocol = "socket.io";

export interface ServerObject extends Omit<OASServerObject, "variables"> {
  variables?: Record<string, ServerVariableObject>;
  protocol: Protocol;
  protocolVersion?: string;
  security?: SecurityRequirementObject[];
  bindings?: Record<Protocol, SocketIOServerBinding>;
}

export interface AsyncApiObject {
  asyncapi: string;
  /** @desc URI or URN format */
  id?: string;
  info: OASInfoObject;
  servers?: Record<string, ServerObject>;
  channels: ChannelsObject;
  components?: ComponentsObject;
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

export interface ServerVariableObject extends OASServerVariableObject {
  examples?: string[];
}

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
  serverBindings?: Record<Protocol, SocketIOServerBinding>;
  channelBindings?: Record<Protocol, SocketIOChannelBinding>;
  operationBindings?: Record<Protocol, SocketIOOperationBinding>;
  messageBindings?: Record<Protocol, SocketIOMessageBinding>;
}

export interface MessageObject extends MessageTraitObject {
  payload?: SchemaObject | ReferenceObject;
}

export type MessageType = MessageObject | ReferenceObject;

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
  traits?: Record<string, OperationTraitObject>;
  message?: AsyncOperationMessage;
}

export interface OperationTraitObject {
  /** @desc Unique string used to identify the operation. */
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: AsyncTagObject[];
  externalDocs?: ExternalDocumentationObject;
  bindings?: Record<Protocol, SocketIOOperationBinding>;
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
  tags?: AsyncTagObject[];
  externalDocs?: ExternalDocumentationObject;
  bindings?: Record<Protocol, SocketIOMessageBinding>;
}

export interface CorrelationIDObject {
  description?: string;
  location: string;
}

export interface AsyncTagObject {
  name: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
}

export interface SecuritySchemeObject {
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
