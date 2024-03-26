import type {
  InfoObject,
  ReferenceObject,
  SchemaObject,
  ServerVariableObject,
} from "openapi3-ts/oas31";
import {
  WSChannelBinding,
  WSMessageBinding,
  WSOperationBinding,
  WSServerBinding,
} from "./binding";
import { AsyncServerObject } from "./server";

export interface AsyncApiDocument {
  asyncapi: string;
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
  parameters?: Record<string, ParameterObject>;
  /** @desc Map describing protocol-specific definitions for a channel. */
  bindings?: Record<string, WSChannelBinding>;
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
  serverBindings?: Record<string, WSServerBinding>;
  channelBindings?: Record<string, WSChannelBinding>;
  operationBindings?: Record<string, WSOperationBinding>;
  messageBindings?: Record<string, WSMessageBinding>;
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
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: AsyncTagObject[];
  externalDocs?: ExternalDocumentationObject;
  bindings?: Record<string, WSOperationBinding>;
  traits?: Record<string, AsyncOperationTraitObject>;
  message?: AsyncOperationMessage;
}

export interface AsyncOperationTraitObject {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: AsyncTagObject[];
  externalDocs?: ExternalDocumentationObject;
  bindings?: Record<string, WSOperationBinding>;
}

export interface AsyncMessageTraitObject {
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
  bindings?: Record<string, WSMessageBinding>;
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
