import { describe, it, expect, beforeEach } from "vitest";
import { BaseModelMapper } from "./BaseModelMapper";

describe("BaseModelMapper", () => {
  let mapper: BaseModelMapper;

  beforeEach(() => {
    mapper = new BaseModelMapper();
  });

  describe("toAir", () => {
    it("should return URN for Illustrious base model", () => {
      const result = mapper.toAIR("Illustrious");

      expect(result).toBe("urn:air:sdxl:checkpoint:civitai:795765@889818");
    });

    it("should return empty string for unknown base model", () => {
      const result = mapper.toAIR("UnknownModel");

      expect(result).toBe("");
    });

    it("should return empty string for empty string input", () => {
      const result = mapper.toAIR("");

      expect(result).toBe("");
    });

    it("should be case-insensitive", () => {
      const lowercase = mapper.toAIR("illustrious");
      const uppercase = mapper.toAIR("ILLUSTRIOUS");
      const mixedCase = mapper.toAIR("IlLuStRiOuS");

      expect(lowercase).toBe("urn:air:sdxl:checkpoint:civitai:795765@889818");
      expect(uppercase).toBe("urn:air:sdxl:checkpoint:civitai:795765@889818");
      expect(mixedCase).toBe("urn:air:sdxl:checkpoint:civitai:795765@889818");
    });
  });
});
