import { SecuritySchemeObject } from "./security";
import { WS } from "./websockets";

/**
 * @fileoverview AsyncAPI specification
 * @version 3.0.0
 */

interface Bindings<T> {
  ws?: T;
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
  security?: Array<SecuritySchemeObject | ReferenceObject>;
  tags?: TagObject[];
  externalDocs?: ExternalDocumentationObject;
  bindings?: Bindings<WS.Server>;
}

export interface ContactObject {
  name?: string;
  url?: string;
  email?: string;
}

export interface LicenseObject {
  name: string;
  url?: string;
}

/** @since 3.0.0 contains tags and externalDocs */
export interface InfoObject {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: ContactObject;
  license?: LicenseObject;
  tags?: TagObject[];
  externalDocs?: ExternalDocumentationObject;
}

/** @since 3.0.0 channels are optional, added operations */
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

export interface ReferenceObject {
  $ref: string;
}

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
  bindings?: Bindings<WS.Channel>;
}

export interface ServerVariableObject {
  enum?: string[] | boolean[] | number[];
  default: string | boolean | number;
  description?: string;
  examples?: string[];
}

export type SchemaObjectType =
  | "integer"
  | "number"
  | "string"
  | "boolean"
  | "object"
  | "null"
  | "array";

/**
 * @desc DRAFT-07
 * @link https://json-schema.org/specification-links#draft-7
 * @link https://json-schema.org/draft-07/draft-handrews-json-schema-validation-01
 * */
interface Draft07 {
  title?: string;
  type?: SchemaObjectType | SchemaObjectType[];
  required?: string[];
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  enum?: any[];
  const?: any;
  examples?: any[];
  // if,then,else
  readOnly?: boolean;
  writeOnly?: boolean;
  properties?: { [propertyName: string]: SchemaObject | ReferenceObject };
  patternProperties?: { [pattern: string]: SchemaObject | ReferenceObject };
  additionalProperties?: SchemaObject | ReferenceObject | boolean;
  additionalItems?: SchemaObject | ReferenceObject | boolean; // +bool since draft-04
  items?:
    | SchemaObject
    | ReferenceObject
    // non-empty tuple:
    | [
        SchemaObject | ReferenceObject,
        ...Array<SchemaObject | ReferenceObject>,
      ];
  propertyNames?: SchemaObject | ReferenceObject;
  contains?: SchemaObject;
  allOf?: (SchemaObject | ReferenceObject)[];
  oneOf?: (SchemaObject | ReferenceObject)[];
  anyOf?: (SchemaObject | ReferenceObject)[];
  not?: SchemaObject | ReferenceObject;
  /**
   * @desc JSON Schema compliant Content-Type, optional when specified as a key of ContentObject
   * @example image/png
   */
  contentMediaType?: string;
  /**
   * @desc Specifies the Content-Encoding for the schema, supports all encodings from RFC4648, and "quoted-printable" from RFC2045
   * @override format
   * @see https://datatracker.ietf.org/doc/html/rfc4648
   * @see https://datatracker.ietf.org/doc/html/rfc2045#section-6.7
   * @example base64
   */
  contentEncoding?: string;
}

/** @link https://www.asyncapi.com/docs/reference/specification/v3.0.0#schemaObject */
export interface SchemaObject extends Draft07 {
  // overrides:
  description?: string; // supports markdown
  format?:
    | "int32" // no changes, but declared as more loose
    | "int64"
    | "float"
    | "double"
    | "byte"
    | "binary"
    | "date"
    | "date-time"
    | "password"
    | string;
  default?: any; // must comply the type
  // proprietary:
  discriminator?: string;
  externalDocs?: ExternalDocumentationObject | ReferenceObject;
  deprecated?: boolean;
}

/** @since 3.0.0 added replies */
export interface ComponentsObject {
  schemas?: Record<string, SchemaObject | ReferenceObject>;
  servers?: Record<string, ServerObject>;
  serverVariables?: Record<string, ServerVariableObject>;
  channels?: Record<string, ChannelObject>;
  messages?: Record<string, MessageObject>;
  securitySchemes?: Record<string, SecuritySchemeObject>;
  parameters?: Record<string, ParameterObject>;
  correlationIds?: Record<string, CorrelationIDObject>;
  operationTraits?: Record<string, OperationTraitObject>;
  messageTraits?: Record<string, MessageTraitObject>;
  replies?: Record<string, OperationReplyObject>;
  serverBindings?: Bindings<WS.Server>;
  channelBindings?: Bindings<WS.Channel>;
  operationBindings?: Bindings<WS.Operation>;
  messageBindings?: Bindings<WS.Message>;
}

/** @since 3.0.0 supports MultiFormatSchemaObject in payload */
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
  reply?: OperationReplyObject | ReferenceObject;
  traits?: Record<string, OperationTraitObject>;
}

/**
 * @desc Describes the reply part that MAY be applied to an Operation Object.
 * @desc If an operation implements the request/reply pattern, the reply object represents the response message.
 * @since 3.0.0 new
 * */
interface OperationReplyObject {
  /** @desc Definition of the address that implementations MUST use for the reply. */
  address?: OperationReplyAddressObject | ReferenceObject;
  /** @desc A $ref pointer to the definition of the channel in which this operation is performed. */
  channel?: ReferenceObject;
  /** @desc A list of pointers to the supported Message Objects that can be processed by this operation as reply */
  messages?: ReferenceObject[];
}

/**
 * @desc An object that specifies where an operation has to send the reply.
 * @since 3.0.0 new
 * */
interface OperationReplyAddressObject {
  /**
   * @desc A runtime expression that specifies the location of the reply address.
   * @example $message.header#/replyTo
   * @example $message.payload#/messageId
   * @link https://www.asyncapi.com/docs/reference/specification/v3.0.0#runtimeExpression
   * */
  location: string;
  description?: string;
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
  security?: Array<SecuritySchemeObject | ReferenceObject>;
  tags?: TagObject[];
  externalDocs?: ExternalDocumentationObject;
  bindings?: Bindings<WS.Operation>;
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
  bindings?: Bindings<WS.Message>;
  examples?: MessageExampleObject[];
}

/**
 * @desc Represents an example of a Message Object and MUST contain either headers and/or payload fields.
 * @since 3.0.0 new
 * */
interface MessageExampleObject {
  name?: string;
  summary?: string;
  headers?: Record<string, any>;
  payload?: any; // https://www.asyncapi.com/docs/reference/specification/v3.0.0#messageExampleObject
}

/** @since 3.0.0 new */
interface MultiFormatSchemaObject {
  /**
   * @desc A string containing the name of the schema format that is used to define the information.
   * @example application/vnd.aai.asyncapi+yaml;version=3.0.0
   * @example application/schema+yaml;version=draft-07
   * @example application/vnd.oai.openapi+yaml;version=3.0.0
   * */
  schemaFormat: string;
  schema: SchemaObject;
}

export interface CorrelationIDObject {
  description?: string;
  /**
   * @desc A runtime expression that specifies the location of the correlation ID.
   * @example $message.header#/correlationId
   * @link https://www.asyncapi.com/docs/reference/specification/v3.0.0#runtimeExpression
   * */
  location: string;
}

export interface TagObject {
  name: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject;
}

/** @since 3.0.0 partially extends SchemaObject; schema prop removed */
export interface ParameterObject
  extends Pick<SchemaObject, "enum" | "default" | "description" | "examples"> {
  /**
   * @desc A runtime expression that specifies the location of the parameter value.
   * @link https://www.asyncapi.com/docs/reference/specification/v3.0.0#runtimeExpression
   * */
  location?: string;
}

/** @desc Property pattern ^[A-Za-z0-9_\-]+$ */
export type ParametersObject = Record<string, ParameterObject>;

export interface ExternalDocumentationObject {
  description?: string;
  url: string;
}
