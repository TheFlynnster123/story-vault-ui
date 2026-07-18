import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { d } from "../../../services/Dependencies";
import {
  ModelPresetsService,
  type ModelPresets,
} from "./ModelPresetsService";

describe("ModelPresetsService", () => {
  let stored: ModelPresets;
  const get = vi.fn();
  const save = vi.fn();
  const subscribe = vi.fn();

  beforeEach(() => {
    stored = { presets: [] };
    get.mockImplementation(async () => stored);
    save.mockImplementation(async (value: ModelPresets) => {
      stored = value;
    });
    subscribe.mockReturnValue(vi.fn());
    vi.spyOn(d, "ModelPresetsManagedBlob").mockReturnValue({
      get,
      save,
      subscribe,
    } as unknown as ReturnType<typeof d.ModelPresetsManagedBlob>);
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000001",
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createService = () => new ModelPresetsService();

  it("saves a named model configuration to the managed blob", async () => {
    const service = createService();

    const preset = await service.savePreset({
      name: " Creative ",
      modelId: "openai/gpt-4",
      requestSettings: { temperature: 0.8 },
    });

    expect(preset.name).toBe("Creative");
    expect(preset.modelId).toBe("openai/gpt-4");
    expect(preset.requestSettings).toEqual({ temperature: 0.8 });
    expect(save).toHaveBeenCalledWith({ presets: [preset] });
  });

  it("returns most recently updated presets first", async () => {
    const service = createService();
    await service.savePreset({ name: "First", modelId: "first/model" });
    vi.mocked(Date.now).mockReturnValue(2_000);
    vi.mocked(crypto.randomUUID).mockReturnValue(
      "00000000-0000-4000-8000-000000000002",
    );
    await service.savePreset({ name: "Second", modelId: "second/model" });

    expect((await service.getPresets()).map((preset) => preset.name)).toEqual([
      "Second",
      "First",
    ]);
  });

  it("updates an existing preset without changing its creation time", async () => {
    const service = createService();
    const original = await service.savePreset({
      name: "Draft",
      modelId: "first/model",
    });
    vi.mocked(Date.now).mockReturnValue(2_000);

    const updated = await service.savePreset({
      id: original.id,
      name: "Final",
      modelId: "second/model",
      requestSettings: { top_p: 0.9 },
    });

    expect(updated.createdAtUtcMs).toBe(1_000);
    expect(updated.updatedAtUtcMs).toBe(2_000);
    expect(updated.name).toBe("Final");
    expect(updated.modelId).toBe("second/model");
  });

  it("deletes a preset from the managed blob", async () => {
    const service = createService();
    const preset = await service.savePreset({
      name: "Temporary",
      modelId: "openai/gpt-4",
    });

    await service.deletePreset(preset.id);

    expect(await service.getPresets()).toEqual([]);
    expect(save).toHaveBeenLastCalledWith({ presets: [] });
  });

  it("subscribes to managed blob changes", () => {
    const service = createService();
    const listener = vi.fn();

    service.subscribe(listener);

    expect(subscribe).toHaveBeenCalledWith(listener);
  });

  it("rejects an empty preset name", async () => {
    const service = createService();

    await expect(
      service.savePreset({ name: " ", modelId: "openai/gpt-4" }),
    ).rejects.toThrow("Preset name is required");
  });
});
