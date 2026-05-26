import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "../../../testing";
import { ImageModelListItem } from "./ImageModelListItem";
import type {
  ImageModel,
  LegacyJobImageModel,
} from "../services/modelGeneration/ImageModel";

vi.mock("./ModelSampleImage", () => ({
  ModelSampleImage: () => <div data-testid="model-sample-image" />,
}));

describe("ImageModelListItem", () => {
  const workflowModel: ImageModel = {
    format: "workflow",
    id: "workflow-1",
    name: "Workflow Model",
    timestampUtcMs: 1,
    input: {
      engine: "sdcpp",
      ecosystem: "sdxl",
      operation: "createImage",
      model: "urn:air:sdxl:checkpoint:civitai:1@2",
      prompt: "workflow prompt",
      width: 1024,
      height: 1024,
    },
  };

  const legacyModel: LegacyJobImageModel = {
    id: "legacy-1",
    name: "Legacy Model",
    timestampUtcMs: 1,
    format: "legacy-job",
    input: {
      model: "urn:air:sdxl:checkpoint:civitai:1@2",
      params: { prompt: "legacy prompt" },
    },
  };

  it("shows workflow models as selectable", () => {
    const onSelect = vi.fn();

    render(
      <ImageModelListItem
        model={workflowModel}
        isSelected={false}
        onSelect={onSelect}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByText("Workflow")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    expect(onSelect).toHaveBeenCalled();
  });

  it("locks legacy models and exposes migration", () => {
    const onSelect = vi.fn();
    const onMigrate = vi.fn();

    render(
      <ImageModelListItem
        model={legacyModel}
        isSelected={false}
        onSelect={onSelect}
        onEdit={vi.fn()}
        onMigrate={onMigrate}
      />,
    );

    expect(screen.getByText("Legacy image model")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select" })).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: "Migrate to workflow" }),
    );

    expect(onMigrate).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
