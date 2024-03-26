import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";
import {
  WSChannelBinding,
  WSMessageBinding,
  WSOperationBinding,
  WSServerBinding,
} from "./websocket-binding";

export interface SocketIOServerBinding extends WSServerBinding {}
export interface SocketIOChannelBinding extends WSChannelBinding {}
export interface SocketIOOperationBinding extends WSOperationBinding {}
export interface SocketIOMessageBinding extends WSMessageBinding {
  /** @desc Acknowledgement schema */
  ack?: SchemaObject | ReferenceObject;
}
