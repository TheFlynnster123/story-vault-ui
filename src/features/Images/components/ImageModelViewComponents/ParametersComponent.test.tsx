import { describe, expect, it, vi } from "vitest";
import { render, screen } from "../../../../testing";
import type { ImageModel } from "../../services/modelGeneration/ImageModel";
import { ParametersComponent } from "./ParametersComponent";

const kreaModel = (): ImageModel => ({
  format: "workflow",
  id: "krea-model",
  name: "Krea 2 import",
  timestampUtcMs: 1,
  input: {
    engine: "fal",
    ecosystem: "krea2",
    operation: "createImage",
    model: "krea2",
    prompt: "a cinematic portrait",
    size: "medium",
    aspectRatio: "9:16",
    creativity: "medium",
  },
});

describe("ParametersComponent", () => {
  it("shows native Krea controls and hides SD-only parameters", () => {
    render(<ParametersComponent imageModel={kreaModel()} onChange={vi.fn()} />);

    expect(screen.getByDisplayValue("Krea 2")).toBeDefined();
    expect(screen.getByText("Quality")).toBeDefined();
    expect(screen.getByText("Aspect Ratio")).toBeDefined();
    expect(screen.getByText("Creativity")).toBeDefined();
    expect(screen.queryByText("Steps")).toBeNull();
    expect(screen.queryByText("CFG Scale")).toBeNull();
    expect(screen.queryByText("Model (AIR)")).toBeNull();
  });
});
