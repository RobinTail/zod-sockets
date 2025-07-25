import { AsyncApiBuilder } from "./builder";

describe("AsyncApiBuilder", () => {
  const builder = new AsyncApiBuilder({
    info: { title: "test", version: "1.0.0" },
  });

  describe("getSpec()", () => {
    test("should return the document", () => {
      expect(builder.getSpec()).toMatchSnapshot();
    });
  });

  describe("getSpecAsJson()", () => {
    test("should return the document", () => {
      expect(builder.getSpecAsJson()).toMatchSnapshot();
    });
  });

  describe("getSpecAsYaml()", () => {
    test("should return the document", () => {
      expect(builder.getSpecAsYaml()).toMatchSnapshot();
    });
  });
});
