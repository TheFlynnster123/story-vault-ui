import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../test-utils";
import { ModelFromImage } from "./ModelFromImage";
import type { ImageModel } from "../../app/ImageModels/ImageModel";

const mockGenerateImageModel = vi.fn();

vi.mock("../../app/Dependencies/Dependencies", () => ({
  d: {
    ImageModelFromGeneratedImageService: vi.fn(() => ({
      GenerateImageModel: mockGenerateImageModel,
    })),
    ErrorService: vi.fn(() => ({
      log: vi.fn(),
    })),
  },
}));

describe("ModelFromImage", () => {
  const mockOnModelLoaded = vi.fn();
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render correctly", () => {
    render(<ModelFromImage onModelLoaded={mockOnModelLoaded} />);

    expect(screen.getByText("Load Model from Image")).toBeDefined();
    expect(screen.getByRole("textbox")).toBeDefined();
    expect(screen.getByRole("button", { name: /Load Model/ })).toBeDefined();
  });

  it("should extract image ID from URL", async () => {
    mockGenerateImageModel.mockResolvedValue(mockImageModel);

    render(<ModelFromImage onModelLoaded={mockOnModelLoaded} />);

    const input = screen.getByRole("textbox");
    const button = screen.getByRole("button", { name: /Load Model/ });

    fireEvent.change(input, {
      target: {
        value: "https://civitai.com/api/generation/data?type=image&id=123456",
      },
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockGenerateImageModel).toHaveBeenCalledWith(
        "https://civitai.com/api/generation/data?type=image&id=123456"
      );
    });
  });

  it("should extract image ID from new path format URL", async () => {
    mockGenerateImageModel.mockResolvedValue(mockImageModel);

    render(<ModelFromImage onModelLoaded={mockOnModelLoaded} />);

    const input = screen.getByRole("textbox");
    const button = screen.getByRole("button", { name: /Load Model/ });

    fireEvent.change(input, {
      target: {
        value: "https://civitai.com/images/123456789",
      },
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockGenerateImageModel).toHaveBeenCalledWith(
        "https://civitai.com/images/123456789"
      );
    });
  });

  it("should handle plain image ID", async () => {
    mockGenerateImageModel.mockResolvedValue(mockImageModel);

    render(<ModelFromImage onModelLoaded={mockOnModelLoaded} />);

    const input = screen.getByRole("textbox");
    const button = screen.getByRole("button", { name: /Load Model/ });

    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockGenerateImageModel).toHaveBeenCalledWith("123456");
    });
  });

  it("should call onModelLoaded when model is successfully loaded", async () => {
    mockGenerateImageModel.mockResolvedValue(mockImageModel);

    render(<ModelFromImage onModelLoaded={mockOnModelLoaded} />);

    const input = screen.getByRole("textbox");
    const button = screen.getByRole("button", { name: /Load Model/ });

    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnModelLoaded).toHaveBeenCalledWith(mockImageModel);
    });

    expect(
      screen.getByText(/Successfully loaded model: Test Model/)
    ).toBeDefined();
  });

  it("should show error for invalid input", async () => {
    mockGenerateImageModel.mockRejectedValue(
      new Error("Could not get an image Id from the provided input!")
    );

    render(<ModelFromImage onModelLoaded={mockOnModelLoaded} />);

    const input = screen.getByRole("textbox");
    const button = screen.getByRole("button", { name: /Load Model/ });

    fireEvent.change(input, { target: { value: "invalid-input" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Failed to load model. Please check the URL or ID and try again."
        )
      ).toBeDefined();
    });
  });

  it("should show error when model loading fails", async () => {
    mockGenerateImageModel.mockResolvedValue(null);

    render(<ModelFromImage onModelLoaded={mockOnModelLoaded} />);

    const input = screen.getByRole("textbox");
    const button = screen.getByRole("button", { name: /Load Model/ });

    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load model from the provided image ID")
      ).toBeDefined();
    });
  });

  it("should handle Enter key press", async () => {
    mockGenerateImageModel.mockResolvedValue(mockImageModel);

    render(<ModelFromImage onModelLoaded={mockOnModelLoaded} />);

    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 });

    await waitFor(() => {
      expect(mockGenerateImageModel).toHaveBeenCalledWith("123456");
    });
  });

  it("should clear input after successful load", async () => {
    mockGenerateImageModel.mockResolvedValue(mockImageModel);

    render(<ModelFromImage onModelLoaded={mockOnModelLoaded} />);

    const input = screen.getByRole("textbox") as HTMLInputElement;
    const button = screen.getByRole("button", { name: /Load Model/ });

    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });

  it("should disable button when input is empty", () => {
    render(<ModelFromImage onModelLoaded={mockOnModelLoaded} />);

    const button = screen.getByRole("button", { name: /Load Model/ });
    expect(button).toHaveProperty("disabled", true);
  });

  it("should show loading state", async () => {
    mockGenerateImageModel.mockImplementation(
      () =>
        new Promise((resolve) => setTimeout(() => resolve(mockImageModel), 100))
    );

    render(<ModelFromImage onModelLoaded={mockOnModelLoaded} />);

    const input = screen.getByRole("textbox");
    const button = screen.getByRole("button", { name: /Load Model/ });

    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Loading model from CivitAI...")).toBeDefined();
    });
  });
});
