import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { d } from "../../../services/Dependencies";
import type { PlanPreset, PlanPresets } from "../services/PlanPreset";
import { usePlanPresets } from "./usePlanPresets";

vi.mock("../../../services/Dependencies");

const legacyPreset = {
  id: "preset-1",
  name: "Story Plan",
  prompt: "Plan the story.",
  suggestionPrompt: "Suggest updates.",
  refreshInterval: 5,
  consolidateMessageHistory: true,
  createdAtUtcMs: 10,
  updatedAtUtcMs: 20,
  hideOtherPlans: true,
  excludeOwnPlanFromHistory: true,
} as unknown as PlanPreset;

describe("usePlanPresets", () => {
  const save = vi.fn<[PlanPresets], Promise<void>>();
  const get = vi.fn<[], Promise<PlanPresets | undefined>>();
  const blob = {
    get,
    save,
    subscribe: vi.fn(() => vi.fn()),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ presets: [legacyPreset] });
    save.mockResolvedValue(undefined);
    vi.mocked(d.PlanPresetsManagedBlob).mockReturnValue(blob as never);
  });

  it("does not expose legacy context fields after loading", async () => {
    const { result } = renderHook(() => usePlanPresets());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.presets[0]).not.toHaveProperty("hideOtherPlans");
    expect(result.current.presets[0]).not.toHaveProperty(
      "excludeOwnPlanFromHistory",
    );
  });

  it("removes legacy fields when updating stored presets", async () => {
    const { result } = renderHook(() => usePlanPresets());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(() =>
      result.current.savePreset({
        id: "preset-1",
        name: "Updated Plan",
        prompt: "Updated prompt.",
        refreshInterval: 7,
        consolidateMessageHistory: false,
      }),
    );

    const saved = save.mock.calls[0][0].presets[0];
    expect(saved).not.toHaveProperty("hideOtherPlans");
    expect(saved).not.toHaveProperty("excludeOwnPlanFromHistory");
    expect(saved.suggestionPrompt).toBe("Suggest updates.");
  });

  it("removes legacy fields from remaining presets when deleting", async () => {
    get.mockResolvedValue({
      presets: [
        legacyPreset,
        { ...legacyPreset, id: "preset-2", name: "Second Plan" },
      ],
    });
    const { result } = renderHook(() => usePlanPresets());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(() => result.current.deletePreset("preset-1"));

    expect(save).toHaveBeenCalledWith({
      presets: [
        expect.not.objectContaining({
          hideOtherPlans: expect.anything(),
          excludeOwnPlanFromHistory: expect.anything(),
        }),
      ],
    });
  });
});
