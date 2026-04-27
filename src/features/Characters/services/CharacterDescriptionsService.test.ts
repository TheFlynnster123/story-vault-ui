import { describe, it, expect, beforeEach, vi } from "vitest";
import { CharacterDescriptionsService } from "./CharacterDescriptionsService";
import type { CharacterDescription } from "./CharacterDescription";
import { d } from "../../../services/Dependencies";

vi.mock("../../../services/Dependencies");

describe("CharacterDescriptionsService", () => {
  let service: CharacterDescriptionsService;
  let mockBlob: any;
  const chatId = "test-chat-123";

  beforeEach(() => {
    mockBlob = {
      get: vi.fn(),
      save: vi.fn(),
      saveDebounced: vi.fn(),
      subscribe: vi.fn(),
    };

    (d.CharacterDescriptionsManagedBlob as any) = vi.fn(() => mockBlob);
    service = new CharacterDescriptionsService(chatId);
  });

  describe("get", () => {
    it("should return empty array when no descriptions exist", async () => {
      mockBlob.get.mockResolvedValue(undefined);

      const result = await service.get();

      expect(result).toEqual([]);
    });

    it("should return existing descriptions", async () => {
      const mockDescriptions = createMockDescriptions();
      mockBlob.get.mockResolvedValue(mockDescriptions);

      const result = await service.get();

      expect(result).toEqual(mockDescriptions);
    });
  });

  describe("save", () => {
    it("should save descriptions to blob", async () => {
      const descriptions = createMockDescriptions();

      await service.save(descriptions);

      expect(mockBlob.save).toHaveBeenCalledWith(descriptions);
    });
  });

  describe("saveDebounced", () => {
    it("should save descriptions with debounce", () => {
      const descriptions = createMockDescriptions();

      service.saveDebounced(descriptions);

      expect(mockBlob.saveDebounced).toHaveBeenCalledWith(descriptions);
    });
  });

  describe("findByName", () => {
    it("should find character by exact name match", async () => {
      const descriptions = createMockDescriptions();
      mockBlob.get.mockResolvedValue(descriptions);

      const result = await service.findByName("Sarah Chen");

      expect(result).toEqual(descriptions[0]);
    });

    it("should find character by case-insensitive match", async () => {
      const descriptions = createMockDescriptions();
      mockBlob.get.mockResolvedValue(descriptions);

      const result = await service.findByName("SARAH CHEN");

      expect(result).toEqual(descriptions[0]);
    });

    it("should find character ignoring whitespace", async () => {
      const descriptions = createMockDescriptions();
      mockBlob.get.mockResolvedValue(descriptions);

      const result = await service.findByName("  Sarah Chen  ");

      expect(result).toEqual(descriptions[0]);
    });

    it("should return undefined when character not found", async () => {
      const descriptions = createMockDescriptions();
      mockBlob.get.mockResolvedValue(descriptions);

      const result = await service.findByName("Unknown Character");

      expect(result).toBeUndefined();
    });
  });

  describe("upsertDescription", () => {
    it("should add new character when it does not exist", async () => {
      mockBlob.get.mockResolvedValue([]);
      const newCharacter = createMockCharacter("New Character");

      await service.upsertDescription(newCharacter);

      expect(mockBlob.save).toHaveBeenCalledWith([newCharacter]);
    });

    it("should update existing character when it exists", async () => {
      const existing = createMockCharacter("Sarah Chen", "char-1");
      mockBlob.get.mockResolvedValue([existing]);
      const updated = { ...existing, description: "Updated description" };

      await service.upsertDescription(updated);

      expect(mockBlob.save).toHaveBeenCalledWith([updated]);
    });

    it("should preserve other characters when updating", async () => {
      const char1 = createMockCharacter("Sarah Chen", "char-1");
      const char2 = createMockCharacter("John Doe", "char-2");
      mockBlob.get.mockResolvedValue([char1, char2]);
      const updatedChar1 = { ...char1, description: "Updated" };

      await service.upsertDescription(updatedChar1);

      expect(mockBlob.save).toHaveBeenCalledWith([updatedChar1, char2]);
    });
  });

  describe("removeDescription", () => {
    it("should remove character by id", async () => {
      const char1 = createMockCharacter("Sarah Chen", "char-1");
      const char2 = createMockCharacter("John Doe", "char-2");
      mockBlob.get.mockResolvedValue([char1, char2]);

      await service.removeDescription("char-1");

      expect(mockBlob.save).toHaveBeenCalledWith([char2]);
    });

    it("should do nothing when character not found", async () => {
      const char1 = createMockCharacter("Sarah Chen", "char-1");
      mockBlob.get.mockResolvedValue([char1]);

      await service.removeDescription("non-existent");

      expect(mockBlob.save).toHaveBeenCalledWith([char1]);
    });
  });

  describe("createBlankCharacter", () => {
    it("should create new blank character when it does not exist", async () => {
      mockBlob.get.mockResolvedValue([]);

      const result = await service.createBlankCharacter("New Character");

      expect(result.name).toBe("New Character");
      expect(result.description).toBe("");
      expect(mockBlob.save).toHaveBeenCalled();
    });

    it("should return existing character when it exists", async () => {
      const existing = createMockCharacter("Sarah Chen", "char-1");
      mockBlob.get.mockResolvedValue([existing]);

      const result = await service.createBlankCharacter("Sarah Chen");

      expect(result).toEqual(existing);
      expect(mockBlob.save).not.toHaveBeenCalled();
    });
  });

  describe("updateCharacter", () => {
    it("should update character name", async () => {
      const existing = createMockCharacter("Sarah Chen", "char-1");
      mockBlob.get.mockResolvedValue([existing]);

      await service.updateCharacter("char-1", { name: "Sarah Johnson" });

      const savedCall = mockBlob.save.mock.calls[0][0];
      expect(savedCall[0].name).toBe("Sarah Johnson");
    });

    it("should update character description", async () => {
      const existing = createMockCharacter("Sarah Chen", "char-1");
      mockBlob.get.mockResolvedValue([existing]);

      await service.updateCharacter("char-1", {
        description: "New description",
      });

      const savedCall = mockBlob.save.mock.calls[0][0];
      expect(savedCall[0].description).toBe("New description");
    });

    it("should update updatedAt timestamp", async () => {
      const existing = createMockCharacter("Sarah Chen", "char-1");
      const originalUpdatedAt = existing.updatedAt;
      mockBlob.get.mockResolvedValue([existing]);

      await new Promise((resolve) => setTimeout(resolve, 10));
      await service.updateCharacter("char-1", { name: "Sarah Johnson" });

      const savedCall = mockBlob.save.mock.calls[0][0];
      expect(savedCall[0].updatedAt).not.toBe(originalUpdatedAt);
    });

    it("should do nothing when character not found", async () => {
      mockBlob.get.mockResolvedValue([]);

      await service.updateCharacter("non-existent", { name: "New Name" });

      expect(mockBlob.save).not.toHaveBeenCalled();
    });
  });

  describe("subscribe", () => {
    it("should subscribe to blob changes", () => {
      const callback = vi.fn();
      mockBlob.subscribe.mockReturnValue(() => {});

      service.subscribe(callback);

      expect(mockBlob.subscribe).toHaveBeenCalledWith(callback);
    });
  });
});

const createMockCharacter = (
  name: string,
  id: string = "char-1",
): CharacterDescription => ({
  id,
  name,
  description: `Description for ${name}`,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
});

const createMockDescriptions = (): CharacterDescription[] => [
  createMockCharacter("Sarah Chen", "char-1"),
  createMockCharacter("John Doe", "char-2"),
];
