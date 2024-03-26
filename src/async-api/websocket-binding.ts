import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

/**
 * @see https://github.com/asyncapi/bindings/tree/master/websockets
 * @desc Protocol-specific definitions for a server.
 * @desc This object MUST NOT contain any properties. Its name is reserved for future use.
 */
export interface WSServerBinding {}

/** @desc Protocol-specific definitions for a channel. */
export interface WSChannelBinding {
  /**
   * @desc The HTTP method to use when establishing the connection. Its value MUST be either GET or POST.
   * */
  method: "GET" | "POST";
  /**
   * @desc A Schema object containing the definitions for each query parameter.
   * @desc This schema MUST be of type object and have a properties key.
   */
  query: SchemaObject | ReferenceObject;
  /**
   * @desc A Schema object containing the definitions of the HTTP headers to use when establishing the connection.
   * @desc This schema MUST be of type object and have a properties key.
   */
  headers: SchemaObject | ReferenceObject;
  /**
   * @desc The version of this binding. If omitted, "latest" MUST be assumed.
   */
  bindingVersion?: "0.1.0";
}

/**
 * @desc Protocol-specific definitions for an operation.
 * @desc This object MUST NOT contain any properties. Its name is reserved for future use.
 * */
export interface WSOperationBinding {}

/**
 * @desc Protocol-specific definitions for a message.
 * @desc This object MUST NOT contain any properties. Its name is reserved for future use.
 * */
export interface WSMessageBinding {}
