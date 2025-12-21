import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../test-utils";
import { SampleImageGenerator } from "./SampleImageGenerator";
import type { ImageModel } from "../../app/ImageModels/ImageModel";
import { CivitJobAPI } from "../../clients/CivitJobAPI";
import { useCivitJob } from "../../hooks/useCivitJob";

// Mock the CivitJobAPI
vi.mock("../../clients/CivitJobAPI");

// Mock the useCivitJob hook
vi.mock("../../hooks/useCivitJob");

// Mock the Dependencies
vi.mock("../../app/Dependencies/Dependencies", () => ({
  d: {
    ErrorService: vi.fn(() => ({
      log: vi.fn(),
    })),
  },
}));

describe("SampleImageGenerator", () => {
  const mockImageModel: ImageModel = {
    id: "test-id",
    timestampUtcMs: Date.now(),
    name: "Test Model",
    input: {
      model: "test-model",
      params: {
        prompt: "test prompt",
        negativePrompt: "test negative",
        scheduler: "DPM++ 2M",
        steps: 20,
        cfgScale: 7.5,
        width: 512,
        height: 512,
        clipSkip: 1,
      },
    },
  };

  const mockOnSampleImageCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock return values
    vi.mocked(useCivitJob).mockReturnValue({
      photoBase64: null,
    } as any);

    const mockGenerateImage = vi.fn();
    vi.mocked(CivitJobAPI).mockImplementation(
      () =>
        ({
          generateImage: mockGenerateImage,
        } as any)
    );
  });

  it("should render button with default state", () => {
    render(
      <SampleImageGenerator
        model={mockImageModel}
        onSampleImageCreated={mockOnSampleImageCreated}
      />
    );

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Generate Sample");
    expect(button).not.toBeDisabled();
  });

  it("should show generating state when button is clicked", async () => {
    const mockGenerateImage = vi.fn().mockImplementation(async () => {
      // Delay to allow us to see the generating state
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { jobs: [{ jobId: "test-job-123" }] };
    });

    vi.mocked(CivitJobAPI).mockImplementation(
      () =>
        ({
          generateImage: mockGenerateImage,
        } as any)
    );

    render(
      <SampleImageGenerator
        model={mockImageModel}
        onSampleImageCreated={mockOnSampleImageCreated}
      />
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    // Should show generating state (both isGenerating and isWaitingForJob show this message)
    expect(button).toHaveTextContent("Generating image...");
    expect(button).toBeDisabled();
  });

  it("should show success state when image is generated", () => {
    const mockBase64 = "data:image/jpeg;base64,mockimagedata";

    // Mock a model with existing job and image
    const modelWithJobId: ImageModel = {
      ...mockImageModel,
      sampleImageId: "existing-job-123",
    };

    vi.mocked(useCivitJob).mockReturnValue({
      photoBase64: mockBase64,
    } as any);

    render(
      <SampleImageGenerator
        model={modelWithJobId}
        onSampleImageCreated={mockOnSampleImageCreated}
      />
    );

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Generate Sample");
    expect(button).not.toBeDisabled();
    // Should have green color and checkmark icon when successful
  });

  it("should show error state when generation fails", async () => {
    const mockGenerateImage = vi.fn().mockRejectedValue(new Error("API Error"));
    vi.mocked(CivitJobAPI).mockImplementation(
      () =>
        ({
          generateImage: mockGenerateImage,
        } as any)
    );

    render(
      <SampleImageGenerator
        model={mockImageModel}
        onSampleImageCreated={mockOnSampleImageCreated}
      />
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toHaveTextContent("Generation Failed - Retry");
      expect(button).not.toBeDisabled();
    });
  });

  it("should call onSampleImageCreated when job is created", async () => {
    const mockGenerateImage = vi.fn().mockResolvedValue({
      jobs: [{ jobId: "test-job-456" }],
    });
    vi.mocked(CivitJobAPI).mockImplementation(
      () =>
        ({
          generateImage: mockGenerateImage,
        } as any)
    );

    render(
      <SampleImageGenerator
        model={mockImageModel}
        onSampleImageCreated={mockOnSampleImageCreated}
      />
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnSampleImageCreated).toHaveBeenCalledWith("test-job-456");
    });
  });

  it("should include additional networks in generation request", async () => {
    const mockGenerateImage = vi.fn().mockResolvedValue({
      jobs: [{ jobId: "test-job-789" }],
    });
    vi.mocked(CivitJobAPI).mockImplementation(
      () =>
        ({
          generateImage: mockGenerateImage,
        } as any)
    );

    const modelWithNetworks: ImageModel = {
      ...mockImageModel,
      input: {
        ...mockImageModel.input,
        additionalNetworks: {
          "test-network-1": { strength: 0.8 },
          "test-network-2": { strength: 0.6 },
        },
      },
    };

    render(
      <SampleImageGenerator
        model={modelWithNetworks}
        onSampleImageCreated={mockOnSampleImageCreated}
      />
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockGenerateImage).toHaveBeenCalledWith({
        model: "test-model",
        params: {
          prompt: "test prompt",
          negativePrompt: "test negative",
          scheduler: "DPM++ 2M",
          steps: 20,
          cfgScale: 7.5,
          width: 512,
          height: 512,
          clipSkip: 1,
        },
        additionalNetworks: {
          "test-network-1": { strength: 0.8 },
          "test-network-2": { strength: 0.6 },
        },
      });
    });
  });

  it("should use correct chat ID for job polling", () => {
    render(
      <SampleImageGenerator
        model={mockImageModel}
        onSampleImageCreated={mockOnSampleImageCreated}
      />
    );

    expect(useCivitJob).toHaveBeenCalledWith("SAMPLE_IMAGE_GENERATOR", "");
  });

  it("should retry generation when error state button is clicked", async () => {
    const mockGenerateImage = vi
      .fn()
      .mockRejectedValueOnce(new Error("First failure"))
      .mockResolvedValueOnce({ jobs: [{ jobId: "retry-job-123" }] });

    vi.mocked(CivitJobAPI).mockImplementation(
      () =>
        ({
          generateImage: mockGenerateImage,
        } as any)
    );

    render(
      <SampleImageGenerator
        model={mockImageModel}
        onSampleImageCreated={mockOnSampleImageCreated}
      />
    );

    const button = screen.getByRole("button");

    // First click fails
    fireEvent.click(button);
    await waitFor(() => {
      expect(button).toHaveTextContent("Generation Failed - Retry");
    });

    // Click retry
    fireEvent.click(button);
    await waitFor(() => {
      expect(mockOnSampleImageCreated).toHaveBeenCalledWith("retry-job-123");
    });
  });
});
