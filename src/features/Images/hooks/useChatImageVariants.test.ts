import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "../../../testing";
import { useChatImageVariants } from "./useChatImageVariants";
import type { ImageModelVariant } from "../services/ImageModelVariant";
import type { ChatImageVariants } from "../services/ChatImageVariantsManagedBlob";

const mockGetAll = vi.fn();
const mockSaveVariant = vi.fn();
const mockDeleteVariant = vi.fn();
const mockSelectVariant = vi.fn();
const mockSelectSystemModel = vi.fn();
const mockCreateVariant = vi.fn();
const mockFindParentModel = vi.fn();
const mockSubscribe = vi.fn(() => vi.fn()); // returns unsubscribe fn
const mockLog = vi.fn();

vi.mock("../../../services/Dependencies", () => ({
  d: {
    ChatImageVariantService: () => ({
      GetAll: mockGetAll,
      SaveVariant: mockSaveVariant,
      DeleteVariant: mockDeleteVariant,
      SelectVariant: mockSelectVariant,
      SelectSystemModel: mockSelectSystemModel,
      CreateVariant: mockCreateVariant,
      findParentModel: mockFindParentModel,
      subscribe: mockSubscribe,
    }),
    ErrorService: () => ({
      log: mockLog,
    }),
  },
}));

const makeVariant = (id: string): ImageModelVariant => ({
  id,
  name: `Variant ${id}`,
  parentModelId: "parent-1",
  timestampUtcMs: Date.now(),
  overrides: {},
});

const makeEmpty = (): ChatImageVariants => ({
  selectedVariantId: "",
  selectedSystemModelId: "",
  variants: [],
});

const waitForLoad = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

describe("useChatImageVariants", () => {
  const chatId = "chat-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAll.mockResolvedValue(makeEmpty());
    mockSubscribe.mockReturnValue(vi.fn());
  });

  // ── Initial load ─────────────────────────────────────────────────────────

  it("loads variants on mount", async () => {
    const data: ChatImageVariants = {
      selectedVariantId: "v1",
      selectedSystemModelId: "",
      variants: [makeVariant("v1")],
    };
    mockGetAll.mockResolvedValue(data);

    const { result } = renderHook(() => useChatImageVariants(chatId));
    await waitForLoad();

    expect(result.current.chatImageVariants).toEqual(data);
    expect(result.current.loading).toBe(false);
  });

  it("sets error when load fails", async () => {
    mockGetAll.mockRejectedValue(new Error("Load failed"));

    const { result } = renderHook(() => useChatImageVariants(chatId));
    await waitForLoad();

    expect(result.current.error).toBe("Failed to load image model variants");
  });

  it("subscribes to blob changes on mount", async () => {
    renderHook(() => useChatImageVariants(chatId));
    await waitForLoad();

    expect(mockSubscribe).toHaveBeenCalled();
  });

  // ── saveVariant ──────────────────────────────────────────────────────────

  describe("saveVariant", () => {
    it("adds a new variant to state without refetching", async () => {
      mockSaveVariant.mockResolvedValue(true);
      const { result } = renderHook(() => useChatImageVariants(chatId));
      await waitForLoad();

      const variant = makeVariant("v1");
      await act(async () => { await result.current.saveVariant(variant); });

      expect(result.current.chatImageVariants.variants).toHaveLength(1);
      expect(result.current.chatImageVariants.variants[0].id).toBe("v1");
      expect(mockGetAll).toHaveBeenCalledTimes(1);
    });

    it("updates an existing variant in state", async () => {
      const existing = makeVariant("v1");
      mockGetAll.mockResolvedValue({ ...makeEmpty(), variants: [existing] });
      mockSaveVariant.mockResolvedValue(true);

      const { result } = renderHook(() => useChatImageVariants(chatId));
      await waitForLoad();

      const updated = { ...existing, name: "Renamed" };
      await act(async () => { await result.current.saveVariant(updated); });

      expect(result.current.chatImageVariants.variants[0].name).toBe("Renamed");
    });

    it("does not update state when save returns false", async () => {
      mockSaveVariant.mockResolvedValue(false);
      const { result } = renderHook(() => useChatImageVariants(chatId));
      await waitForLoad();

      await act(async () => { await result.current.saveVariant(makeVariant("v1")); });

      expect(result.current.chatImageVariants.variants).toHaveLength(0);
    });
  });

  // ── deleteVariant ────────────────────────────────────────────────────────

  describe("deleteVariant", () => {
    it("removes the variant from state", async () => {
      mockGetAll.mockResolvedValue({
        ...makeEmpty(),
        variants: [makeVariant("v1"), makeVariant("v2")],
      });
      mockDeleteVariant.mockResolvedValue(true);

      const { result } = renderHook(() => useChatImageVariants(chatId));
      await waitForLoad();

      await act(async () => { await result.current.deleteVariant("v1"); });

      expect(result.current.chatImageVariants.variants).toHaveLength(1);
      expect(result.current.chatImageVariants.variants[0].id).toBe("v2");
    });

    it("clears selectedVariantId in state when deleting the selected variant", async () => {
      mockGetAll.mockResolvedValue({
        selectedVariantId: "v1",
        selectedSystemModelId: "",
        variants: [makeVariant("v1")],
      });
      mockDeleteVariant.mockResolvedValue(true);

      const { result } = renderHook(() => useChatImageVariants(chatId));
      await waitForLoad();

      await act(async () => { await result.current.deleteVariant("v1"); });

      expect(result.current.chatImageVariants.selectedVariantId).toBe("");
    });
  });

  // ── selectVariant ────────────────────────────────────────────────────────

  describe("selectVariant", () => {
    it("updates selectedVariantId and clears selectedSystemModelId in state", async () => {
      mockGetAll.mockResolvedValue({
        selectedVariantId: "",
        selectedSystemModelId: "sys-1",
        variants: [makeVariant("v1")],
      });
      mockSelectVariant.mockResolvedValue(true);

      const { result } = renderHook(() => useChatImageVariants(chatId));
      await waitForLoad();

      await act(async () => { await result.current.selectVariant("v1"); });

      expect(result.current.chatImageVariants.selectedVariantId).toBe("v1");
      expect(result.current.chatImageVariants.selectedSystemModelId).toBe("");
    });

    it("does not update state when select returns false", async () => {
      mockSelectVariant.mockResolvedValue(false);
      const { result } = renderHook(() => useChatImageVariants(chatId));
      await waitForLoad();

      const ok = await act(async () => result.current.selectVariant("v1"));

      expect(ok).toBe(false);
      expect(result.current.chatImageVariants.selectedVariantId).toBe("");
    });
  });

  // ── selectSystemModel ────────────────────────────────────────────────────

  describe("selectSystemModel", () => {
    it("updates selectedSystemModelId and clears selectedVariantId in state", async () => {
      mockGetAll.mockResolvedValue({
        selectedVariantId: "v1",
        selectedSystemModelId: "",
        variants: [makeVariant("v1")],
      });
      mockSelectSystemModel.mockResolvedValue(true);

      const { result } = renderHook(() => useChatImageVariants(chatId));
      await waitForLoad();

      await act(async () => { await result.current.selectSystemModel("sys-1"); });

      expect(result.current.chatImageVariants.selectedSystemModelId).toBe("sys-1");
      expect(result.current.chatImageVariants.selectedVariantId).toBe("");
    });

    it("returns false and does not update state when select fails", async () => {
      mockSelectSystemModel.mockResolvedValue(false);
      const { result } = renderHook(() => useChatImageVariants(chatId));
      await waitForLoad();

      const ok = await act(async () => result.current.selectSystemModel("sys-1"));

      expect(ok).toBe(false);
      expect(result.current.chatImageVariants.selectedSystemModelId).toBe("");
    });
  });

  // ── createVariant ────────────────────────────────────────────────────────

  describe("createVariant", () => {
    it("adds the created variant to state", async () => {
      const created = makeVariant("new-v");
      mockCreateVariant.mockResolvedValue(created);

      const { result } = renderHook(() => useChatImageVariants(chatId));
      await waitForLoad();

      const variant = await act(async () =>
        result.current.createVariant("parent-1", "New Variant"),
      );

      expect(variant).toEqual(created);
      expect(result.current.chatImageVariants.variants).toContainEqual(created);
    });

    it("returns null and sets error on failure", async () => {
      mockCreateVariant.mockRejectedValue(new Error("Create failed"));

      const { result } = renderHook(() => useChatImageVariants(chatId));
      await waitForLoad();

      const variant = await act(async () =>
        result.current.createVariant("parent-1", "Fails"),
      );

      expect(variant).toBeNull();
      expect(result.current.error).toBe("Failed to create image model variant");
    });
  });

  // ── getSelectedVariant ───────────────────────────────────────────────────

  describe("getSelectedVariant", () => {
    it("returns the selected variant", async () => {
      const v1 = makeVariant("v1");
      mockGetAll.mockResolvedValue({
        selectedVariantId: "v1",
        selectedSystemModelId: "",
        variants: [v1, makeVariant("v2")],
      });

      const { result } = renderHook(() => useChatImageVariants(chatId));
      await waitForLoad();

      expect(result.current.getSelectedVariant()).toEqual(v1);
    });

    it("returns null when no variant is selected", async () => {
      const { result } = renderHook(() => useChatImageVariants(chatId));
      await waitForLoad();

      expect(result.current.getSelectedVariant()).toBeNull();
    });
  });
});
