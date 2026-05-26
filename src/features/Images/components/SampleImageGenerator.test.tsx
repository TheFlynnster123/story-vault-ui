import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../../testing";
import { SampleImageGenerator } from "./SampleImageGenerator";
import { useCivitJob } from "../hooks/useCivitJob";
import type { ImageModel } from "../services/modelGeneration/ImageModel";
import { d } from "../../../services/Dependencies";

// Mock the useCivitJob hook
vi.mock("../hooks/useCivitJob");

// Mock the Dependencies
vi.mock("../../../services/Dependencies");

describe("SampleImageGenerator", () => {
  const mockImageModel: ImageModel = {
    id: "test-id",
    timestampUtcMs: Date.now(),
    name: "Test Model",
    input: {
      engine: "sdcpp",
      ecosystem: "sdxl",
      operation: "createImage",
      model: "test-model",
      prompt: "test prompt",
      negativePrompt: "test negative",
      sampleMethod: "euler_a",
      steps: 20,
      cfgScale: 7.5,
      width: 512,
      height: 512,
    },
  };

  const mockOnSampleImageCreated = vi.fn();
  let mockCivitOrchestrationAPI: any;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useCivitJob).mockReturnValue({
      photoBase64: null,
    } as any);

    mockCivitOrchestrationAPI = {
      submitWorkflow: vi.fn(),
    };

    vi.mocked(d.CivitOrchestrationAPI).mockReturnValue(
      mockCivitOrchestrationAPI,
    );
    vi.mocked(d.ErrorService).mockReturnValue({
      log: vi.fn(),
    } as any);
  });

  it("should render button with default state", () => {
    render(
      <SampleImageGenerator
        model={mockImageModel}
        onSampleImageCreated={mockOnSampleImageCreated}
      />,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Generate Sample");
    expect(button).not.toBeDisabled();
  });

  it("should show generating state when button is clicked", async () => {
    mockCivitOrchestrationAPI.submitWorkflow.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { id: "wf_test-123", status: "succeeded", steps: [] };
    });

    render(
      <SampleImageGenerator
        model={mockImageModel}
        onSampleImageCreated={mockOnSampleImageCreated}
      />,
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(button).toHaveTextContent("Generating image...");
    expect(button).toBeDisabled();
  });

  it("should show success state when image is generated", () => {
    const mockBase64 = "data:image/jpeg;base64,mockimagedata";

    const modelWithWorkflowId: ImageModel = {
      ...mockImageModel,
      sampleWorkflowId: "wf_existing-123",
    };

    vi.mocked(useCivitJob).mockReturnValue({
      photoBase64: mockBase64,
    } as any);

    render(
      <SampleImageGenerator
        model={modelWithWorkflowId}
        onSampleImageCreated={mockOnSampleImageCreated}
      />,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Generate Sample");
    expect(button).not.toBeDisabled();
  });

  it("should show error state when generation fails", async () => {
    mockCivitOrchestrationAPI.submitWorkflow.mockRejectedValue(
      new Error("API Error"),
    );

    render(
      <SampleImageGenerator
        model={mockImageModel}
        onSampleImageCreated={mockOnSampleImageCreated}
      />,
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toHaveTextContent("Generation Failed - Retry");
      expect(button).not.toBeDisabled();
    });
  });

  it("should call onSampleImageCreated when workflow is created", async () => {
    mockCivitOrchestrationAPI.submitWorkflow.mockResolvedValue({
      id: "wf_test-456",
      status: "succeeded",
      steps: [],
    });

    render(
      <SampleImageGenerator
        model={mockImageModel}
        onSampleImageCreated={mockOnSampleImageCreated}
      />,
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnSampleImageCreated).toHaveBeenCalledWith("wf_test-456");
    });
  });

  it("should use correct chat ID for job polling", () => {
    render(
      <SampleImageGenerator
        model={mockImageModel}
        onSampleImageCreated={mockOnSampleImageCreated}
      />,
    );

    expect(useCivitJob).toHaveBeenCalledWith("SAMPLE_IMAGE_GENERATOR", "");
  });

  it("should retry generation when error state button is clicked", async () => {
    mockCivitOrchestrationAPI.submitWorkflow
      .mockRejectedValueOnce(new Error("First failure"))
      .mockResolvedValueOnce({
        id: "wf_retry-123",
        status: "succeeded",
        steps: [],
      });

    render(
      <SampleImageGenerator
        model={mockImageModel}
        onSampleImageCreated={mockOnSampleImageCreated}
      />,
    );

    const button = screen.getByRole("button");

    fireEvent.click(button);
    await waitFor(() => {
      expect(button).toHaveTextContent("Generation Failed - Retry");
    });

    fireEvent.click(button);
    await waitFor(() => {
      expect(mockOnSampleImageCreated).toHaveBeenCalledWith("wf_retry-123");
    });
  });
});
