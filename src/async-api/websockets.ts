import type { ReferenceObject, SchemaObject } from "./model";

/** @see https://github.com/asyncapi/bindings/tree/master/websockets */
export namespace WS {
  /** @desc This object MUST NOT contain any properties. Its name is reserved for future use. */
  export interface Server {}

  /**
   * @desc When using WebSockets, the channel represents the connection. Unlike other protocols that support multiple
   * @desc virtual channels (topics, routing keys, etc.) per connection, WebSockets doesn't support virtual channels or,
   * @desc put it another way, there's only one channel and its characteristics are strongly related to the protocol
   * @desc used for the handshake, i.e., HTTP.
   */
  export interface Channel {
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
   * */
  export interface Operation {}

  /** @desc This object MUST NOT contain any properties. Its name is reserved for future use. */
  export interface Message {}
}
