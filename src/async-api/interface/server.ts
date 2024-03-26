import type { ServerObject } from "openapi3-ts/oas31";
import { WSServerBinding } from "./binding";
import { AsyncServerVariableObject, Protocol, SecurityObject } from "./commons";

export interface AsyncServerObject extends Omit<ServerObject, "variables"> {
  variables?: Record<string, AsyncServerVariableObject>;
  protocol: Protocol;
  protocolVersion?: string;
  security?: SecurityObject[];
  bindings?: Record<string, WSServerBinding>;
}