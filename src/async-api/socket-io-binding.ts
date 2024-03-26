import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

// @todo use 1.0.0 when production ready
export const version = "0.11.0";

/**
 * @desc Protocol-specific definitions for a server.
 * @desc This object MUST NOT contain any properties. Its name is reserved for future use.
 */
export interface SocketIOServerBinding {}

/** @desc Protocol-specific definitions for a channel. */
export interface SocketIOChannelBinding {
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
  bindingVersion: typeof version;
}

/**
 * @see https://github.com/asyncapi/bindings/tree/master/websockets
 * @desc Protocol-specific definitions for an operation.
 * @desc This object MUST NOT contain any properties. Its name is reserved for future use.
 */
export interface SocketIOOperationBinding {}

/**
 * @desc Protocol-specific definitions for a message.
 * @desc This object MUST NOT contain any properties. Its name is reserved for future use.
 * */
export interface SocketIOMessageBinding {
  /** @desc Acknowledgement schema */
  ack?: SchemaObject | ReferenceObject;
  bindingVersion: typeof version;
}
