import { ReferenceObject, SchemaObject } from "./model";

export function isReferenceObject(
  obj: SchemaObject | ReferenceObject,
): obj is ReferenceObject {
  return "$ref" in obj;
}
