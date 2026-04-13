import { describe, it, expect, beforeEach } from "vitest";
import { RecentModelsService } from "./RecentModelsService";

describe("RecentModelsService", () => {
  let service: RecentModelsService;

  beforeEach(() => {
    localStorage.clear();
    service = new RecentModelsService();
  });

  describe("getRecentModels", () => {
    it("should return empty array when no recent models exist", () => {
      expect(service.getRecentModels()).toEqual([]);
    });

    it("should return stored models", () => {
      localStorage.setItem(
        "story-vault-recent-models",
        JSON.stringify(["model-a", "model-b"]),
      );

      expect(service.getRecentModels()).toEqual(["model-a", "model-b"]);
    });

    it("should handle corrupted localStorage gracefully", () => {
      localStorage.setItem("story-vault-recent-models", "not-json{{{");

      expect(service.getRecentModels()).toEqual([]);
    });
  });

  describe("trackModel", () => {
    it("should add a model to recent list", () => {
      service.trackModel("openai/gpt-4");

      expect(service.getRecentModels()).toEqual(["openai/gpt-4"]);
    });

    it("should move an existing model to the front", () => {
      service.trackModel("model-a");
      service.trackModel("model-b");
      service.trackModel("model-a");

      expect(service.getRecentModels()).toEqual(["model-a", "model-b"]);
    });

    it("should limit to 5 recent models", () => {
      service.trackModel("model-1");
      service.trackModel("model-2");
      service.trackModel("model-3");
      service.trackModel("model-4");
      service.trackModel("model-5");
      service.trackModel("model-6");

      const recent = service.getRecentModels();
      expect(recent).toHaveLength(5);
      expect(recent[0]).toBe("model-6");
      expect(recent).not.toContain("model-1");
    });

    it("should not track empty string", () => {
      service.trackModel("");

      expect(service.getRecentModels()).toEqual([]);
    });
  });
});
