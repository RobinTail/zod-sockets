import { isReferenceObject } from "./helpers";

describe("AsyncAPI Helpers", () => {
  describe("isReferenceObject", () => {
    test("should detect the reference object by the presence of the $ref prop", () => {
      expect(isReferenceObject({})).toBeFalsy();
      expect(isReferenceObject({ type: "null" })).toBeFalsy();
      expect(isReferenceObject({ $ref: "" })).toBeTruthy();
    });
  });
});
