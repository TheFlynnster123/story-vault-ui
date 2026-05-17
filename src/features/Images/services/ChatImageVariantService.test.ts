import { describe, it, expect, beforeEach, vi } from "vitest";
import { ChatImageVariantService } from "./ChatImageVariantService";
import type { ChatImageVariants } from "./ChatImageVariantsManagedBlob";
import type { ImageModelVariant } from "./ImageModelVariant";
import type { ImageModel } from "./modelGeneration/ImageModel";

const mockGet = vi.fn();
const mockSave = vi.fn();
const mockSaveDebounced = vi.fn();
const mockSavePendingChanges = vi.fn();
const mockSubscribe = vi.fn();
const mockIsLoading = vi.fn();
const mockLog = vi.fn();
const mockGetAllImageModels = vi.fn();
const mockGetOrDefaultSelectedModel = vi.fn();

vi.mock("../../../services/Dependencies", () => ({
  d: {
    ChatImageVariantsManagedBlob: vi.fn(() => ({
      get: mockGet,
      save: mockSave,
      saveDebounced: mockSaveDebounced,
      savePendingChanges: mockSavePendingChanges,
      subscribe: mockSubscribe,
      isLoading: mockIsLoading,
    })),
    ErrorService: vi.fn(() => ({
      log: mockLog,
    })),
    ImageModelService: vi.fn(() => ({
      GetAllImageModels: mockGetAllImageModels,
      getOrDefaultSelectedModel: mockGetOrDefaultSelectedModel,
    })),
  },
}));

const makeVariant = (id: string, parentModelId = "parent-1"): ImageModelVariant => ({
  id,
  name: `Variant ${id}`,
  parentModelId,
  timestampUtcMs: Date.now(),
  overrides: {},
});

const makeModel = (id: string): ImageModel => ({
  id,
  name: `Model ${id}`,
  timestampUtcMs: Date.now(),
  input: {
    model: "urn:air:sdxl:checkpoint:civitai:0@0",
    params: {
      prompt: "test prompt",
      negativePrompt: "bad",
      scheduler: "Euler",
      steps: 20,
      cfgScale: 7,
      width: 512,
      height: 512,
      clipSkip: 2,
    },
    additionalNetworks: {},
  },
});

const makeEmpty = (): ChatImageVariants => ({
  selectedVariantId: "",
  selectedSystemModelId: "",
  variants: [],
});

describe("ChatImageVariantService", () => {
  let service: ChatImageVariantService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(undefined);
    mockSaveDebounced.mockResolvedValue(undefined);
    service = new ChatImageVariantService("chat-1");
  });

  // ── GetAll ──────────────────────────────────────────────────────────────

  describe("GetAll", () => {
    it("returns blob data when available", async () => {
      const data: ChatImageVariants = {
        selectedVariantId: "v1",
        selectedSystemModelId: "",
        variants: [makeVariant("v1")],
      };
      mockGet.mockResolvedValue(data);

      const result = await service.GetAll();

      expect(result).toEqual(data);
    });

    it("returns empty defaults when blob is null", async () => {
      mockGet.mockResolvedValue(null);

      const result = await service.GetAll();

      expect(result).toEqual(makeEmpty());
    });
  });

  // ── SaveVariant ─────────────────────────────────────────────────────────

  describe("SaveVariant", () => {
    it("adds a new variant", async () => {
      mockGet.mockResolvedValue(makeEmpty());
      const variant = makeVariant("v1");

      const ok = await service.SaveVariant(variant);

      expect(ok).toBe(true);
      expect(mockSaveDebounced).toHaveBeenCalledWith(
        expect.objectContaining({
          variants: expect.arrayContaining([expect.objectContaining({ id: "v1" })]),
        }),
      );
    });

    it("updates an existing variant", async () => {
      const existing = makeVariant("v1");
      mockGet.mockResolvedValue({ ...makeEmpty(), variants: [existing] });
      const updated = { ...existing, name: "Updated" };

      const ok = await service.SaveVariant(updated);

      expect(ok).toBe(true);
      const saved = mockSaveDebounced.mock.calls[0][0] as ChatImageVariants;
      expect(saved.variants).toHaveLength(1);
      expect(saved.variants[0].name).toBe("Updated");
    });

    it("returns false when variant has no id", async () => {
      const noId = { ...makeVariant(""), id: undefined as any };

      const ok = await service.SaveVariant(noId);

      expect(ok).toBe(false);
      expect(mockLog).toHaveBeenCalledWith(
        "Cannot save variant without a valid ID",
        expect.any(Error),
      );
    });

    it("returns false on unexpected error", async () => {
      mockGet.mockRejectedValue(new Error("Storage error"));

      const ok = await service.SaveVariant(makeVariant("v1"));

      expect(ok).toBe(false);
      expect(mockLog).toHaveBeenCalledWith(
        "Failed to save image model variant",
        expect.any(Error),
      );
    });
  });

  // ── DeleteVariant ───────────────────────────────────────────────────────

  describe("DeleteVariant", () => {
    it("removes the variant", async () => {
      mockGet.mockResolvedValue({
        ...makeEmpty(),
        variants: [makeVariant("v1"), makeVariant("v2")],
      });

      const ok = await service.DeleteVariant("v1");

      expect(ok).toBe(true);
      const saved = mockSaveDebounced.mock.calls[0][0] as ChatImageVariants;
      expect(saved.variants).toHaveLength(1);
      expect(saved.variants[0].id).toBe("v2");
    });

    it("clears selectedVariantId when deleting the selected variant", async () => {
      mockGet.mockResolvedValue({
        selectedVariantId: "v1",
        selectedSystemModelId: "",
        variants: [makeVariant("v1")],
      });

      await service.DeleteVariant("v1");

      const saved = mockSaveDebounced.mock.calls[0][0] as ChatImageVariants;
      expect(saved.selectedVariantId).toBe("");
    });

    it("preserves selectedVariantId when deleting a different variant", async () => {
      mockGet.mockResolvedValue({
        selectedVariantId: "v2",
        selectedSystemModelId: "",
        variants: [makeVariant("v1"), makeVariant("v2")],
      });

      await service.DeleteVariant("v1");

      const saved = mockSaveDebounced.mock.calls[0][0] as ChatImageVariants;
      expect(saved.selectedVariantId).toBe("v2");
    });

    it("returns false on error", async () => {
      mockGet.mockRejectedValue(new Error("Storage error"));

      const ok = await service.DeleteVariant("v1");

      expect(ok).toBe(false);
      expect(mockLog).toHaveBeenCalledWith(
        "Failed to delete image model variant",
        expect.any(Error),
      );
    });
  });

  // ── SelectVariant ───────────────────────────────────────────────────────

  describe("SelectVariant", () => {
    it("sets selectedVariantId and clears selectedSystemModelId", async () => {
      mockGet.mockResolvedValue({
        selectedVariantId: "",
        selectedSystemModelId: "sys-1",
        variants: [makeVariant("v1")],
      });

      const ok = await service.SelectVariant("v1");

      expect(ok).toBe(true);
      const saved = mockSaveDebounced.mock.calls[0][0] as ChatImageVariants;
      expect(saved.selectedVariantId).toBe("v1");
      expect(saved.selectedSystemModelId).toBe("");
    });

    it("returns false when variant does not exist", async () => {
      mockGet.mockResolvedValue(makeEmpty());

      const ok = await service.SelectVariant("nonexistent");

      expect(ok).toBe(false);
      expect(mockSaveDebounced).not.toHaveBeenCalled();
    });

    it("returns false on error", async () => {
      mockGet.mockRejectedValue(new Error("Storage error"));

      const ok = await service.SelectVariant("v1");

      expect(ok).toBe(false);
      expect(mockLog).toHaveBeenCalledWith(
        "Failed to select image model variant",
        expect.any(Error),
      );
    });
  });

  // ── SelectSystemModel ───────────────────────────────────────────────────

  describe("SelectSystemModel", () => {
    it("sets selectedSystemModelId and clears selectedVariantId", async () => {
      mockGetAllImageModels.mockResolvedValue({
        selectedModelId: "",
        models: [makeModel("sys-1")],
      });
      mockGet.mockResolvedValue({
        selectedVariantId: "v1",
        selectedSystemModelId: "",
        variants: [makeVariant("v1")],
      });

      const ok = await service.SelectSystemModel("sys-1");

      expect(ok).toBe(true);
      const saved = mockSaveDebounced.mock.calls[0][0] as ChatImageVariants;
      expect(saved.selectedSystemModelId).toBe("sys-1");
      expect(saved.selectedVariantId).toBe("");
    });

    it("returns false when system model does not exist", async () => {
      mockGetAllImageModels.mockResolvedValue({ selectedModelId: "", models: [] });

      const ok = await service.SelectSystemModel("nonexistent");

      expect(ok).toBe(false);
      expect(mockSaveDebounced).not.toHaveBeenCalled();
    });

    it("returns false on error", async () => {
      mockGetAllImageModels.mockRejectedValue(new Error("Storage error"));

      const ok = await service.SelectSystemModel("sys-1");

      expect(ok).toBe(false);
      expect(mockLog).toHaveBeenCalledWith(
        "Failed to select system image model",
        expect.any(Error),
      );
    });
  });

  // ── CreateVariant ────────────────────────────────────────────────────────

  describe("CreateVariant", () => {
    it("creates a variant with empty overrides", async () => {
      mockGet.mockResolvedValue(makeEmpty());

      const variant = await service.CreateVariant("parent-1", "My Variant");

      expect(variant).not.toBeNull();
      expect(variant!.name).toBe("My Variant");
      expect(variant!.parentModelId).toBe("parent-1");
      expect(variant!.overrides).toEqual({});
      expect(variant!.id).toBeTruthy();
    });

    it("persists the new variant", async () => {
      mockGet.mockResolvedValue(makeEmpty());

      await service.CreateVariant("parent-1", "My Variant");

      expect(mockSaveDebounced).toHaveBeenCalledWith(
        expect.objectContaining({
          variants: expect.arrayContaining([
            expect.objectContaining({ name: "My Variant" }),
          ]),
        }),
      );
    });

    it("returns null on error", async () => {
      mockGet.mockRejectedValue(new Error("Storage error"));

      const result = await service.CreateVariant("parent-1", "Fails");

      expect(result).toBeNull();
      expect(mockLog).toHaveBeenCalledWith(
        "Failed to save image model variant",
        expect.any(Error),
      );
    });
  });

  // ── getSelectedModelOrDefault ────────────────────────────────────────────

  describe("getSelectedModelOrDefault", () => {
    it("resolves selected variant when variant is selected and parent exists", async () => {
      const parent = makeModel("parent-1");
      const variant = makeVariant("v1", "parent-1");
      mockGet.mockResolvedValue({
        selectedVariantId: "v1",
        selectedSystemModelId: "",
        variants: [variant],
      });
      mockGetAllImageModels.mockResolvedValue({
        selectedModelId: "",
        models: [parent],
      });

      const result = await service.getSelectedModelOrDefault();

      // resolveVariant merges parent + empty overrides → same as parent fields
      expect(result.id).toBe("v1");
      expect(result.name).toBe("Variant v1");
    });

    it("falls back to selectedSystemModelId when no variant is selected", async () => {
      const sysModel = makeModel("sys-1");
      mockGet.mockResolvedValue({
        selectedVariantId: "",
        selectedSystemModelId: "sys-1",
        variants: [],
      });
      mockGetAllImageModels.mockResolvedValue({
        selectedModelId: "",
        models: [sysModel],
      });

      const result = await service.getSelectedModelOrDefault();

      expect(result.id).toBe("sys-1");
    });

    it("falls back to global default when selectedSystemModelId model is missing", async () => {
      const globalDefault = makeModel("global-default");
      mockGet.mockResolvedValue({
        selectedVariantId: "",
        selectedSystemModelId: "deleted-model",
        variants: [],
      });
      mockGetAllImageModels.mockResolvedValue({
        selectedModelId: "",
        models: [],
      });
      mockGetOrDefaultSelectedModel.mockResolvedValue(globalDefault);

      const result = await service.getSelectedModelOrDefault();

      expect(result.id).toBe("global-default");
      expect(mockGetOrDefaultSelectedModel).toHaveBeenCalled();
    });

    it("falls back to global default when no variant and no selectedSystemModelId", async () => {
      const globalDefault = makeModel("global-default");
      mockGet.mockResolvedValue(makeEmpty());
      mockGetOrDefaultSelectedModel.mockResolvedValue(globalDefault);

      const result = await service.getSelectedModelOrDefault();

      expect(result.id).toBe("global-default");
    });

    it("falls back through selectedSystemModelId when selected variant parent is missing", async () => {
      const sysModel = makeModel("sys-1");
      const variant = makeVariant("v1", "missing-parent");
      mockGet.mockResolvedValue({
        selectedVariantId: "v1",
        selectedSystemModelId: "sys-1",
        variants: [variant],
      });
      mockGetAllImageModels.mockResolvedValue({
        selectedModelId: "",
        models: [sysModel],
      });

      const result = await service.getSelectedModelOrDefault();

      // parent missing → falls through to selectedSystemModelId
      expect(result.id).toBe("sys-1");
    });
  });

  // ── findParentModel ──────────────────────────────────────────────────────

  describe("findParentModel", () => {
    it("returns the matching global model", async () => {
      const model = makeModel("m1");
      mockGetAllImageModels.mockResolvedValue({ selectedModelId: "", models: [model] });

      const result = await service.findParentModel("m1");

      expect(result).toEqual(model);
    });

    it("returns null when model not found", async () => {
      mockGetAllImageModels.mockResolvedValue({ selectedModelId: "", models: [] });

      const result = await service.findParentModel("nonexistent");

      expect(result).toBeNull();
    });
  });
});
