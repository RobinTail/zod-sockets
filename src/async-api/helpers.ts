import { ReferenceObject, SchemaObject } from "./commons";

export function isReferenceObject(
  obj: SchemaObject | ReferenceObject,
): obj is ReferenceObject {
  return "$ref" in obj;
}
