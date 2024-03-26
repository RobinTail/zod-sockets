import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

/**
 * @see https://github.com/asyncapi/bindings/tree/master/websockets
 * @desc This object MUST NOT contain any properties. Its name is reserved for future use.
 */
export interface WSServerBinding {}

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
  bindingVersion: "0.1.0";
}

/**
 * @desc This object MUST NOT contain any properties. Its name is reserved for future use.
 * @todo Add acknowledgements schema for Sockets.IO bindings
 * */
export interface WSOperationBinding {}

/** @desc This object MUST NOT contain any properties. Its name is reserved for future use. */
export interface WSMessageBinding {}
