import { describe, it, expect } from "vitest";
import { extractModelIdFromAir } from "./AirUtils";

describe("AirUtils", () => {
  describe("extractModelIdFromAir", () => {
    it("should extract model ID from a standard checkpoint AIR", () => {
      const result = extractModelIdFromAir(
        "urn:air:sdxl:checkpoint:civitai:123456@789012",
      );
      expect(result).toBe(123456);
    });

    it("should extract model ID from a LoRA AIR", () => {
      const result = extractModelIdFromAir(
        "urn:air:sdxl:lora:civitai:654321@210987",
      );
      expect(result).toBe(654321);
    });

    it("should extract model ID from a sd1 AIR", () => {
      const result = extractModelIdFromAir(
        "urn:air:sd1:checkpoint:civitai:4384@128713",
      );
      expect(result).toBe(4384);
    });

    it("should return undefined for an empty string", () => {
      expect(extractModelIdFromAir("")).toBeUndefined();
    });

    it("should return undefined for a non-AIR string", () => {
      expect(extractModelIdFromAir("some-random-string")).toBeUndefined();
    });

    it("should return undefined for an AIR without civitai prefix", () => {
      expect(
        extractModelIdFromAir("urn:air:sdxl:checkpoint:other:123456@789012"),
      ).toBeUndefined();
    });
  });
});
