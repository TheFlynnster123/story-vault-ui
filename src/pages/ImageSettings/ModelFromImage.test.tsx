import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../test-utils";
import { ModelFromImage } from "./ModelFromImage";
import { GeneratedImageModelService } from "../../app/ImageModels/GeneratedImageModelService";
import type { ImageModel } from "../../app/ImageModels/ImageModel";

// Mock the GeneratedImageModelService
vi.mock("../../app/ImageModels/GeneratedImageModelService");

// Mock the Dependencies
vi.mock("../../app/Dependencies/Dependencies", () => ({
  d: {
    ErrorService: vi.fn(() => ({
      log: vi.fn(),
    })),
  },
}));

describe("ModelFromImage", () => {
  const mockOnModelLoaded = vi.fn();
  const mockImageModel: ImageModel = {
    id: "test-id",
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

    const mockGenerateImageModel = vi.fn();
    vi.mocked(GeneratedImageModelService).mockImplementation(
      () =>
        ({
          GenerateImageModel: mockGenerateImageModel,
        } as any)
    );
  });

  it("should render correctly", () => {
    render(<ModelFromImage onModelLoaded={mockOnModelLoaded} />);

    expect(screen.getByText("Load Model from Image")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Load Model/ })
    ).toBeInTheDocument();
  });

  it("should extract image ID from URL", async () => {
    const mockGenerateImageModel = vi.fn().mockResolvedValue(mockImageModel);
    vi.mocked(GeneratedImageModelService).mockImplementation(
      () =>
        ({
          GenerateImageModel: mockGenerateImageModel,
        } as any)
    );

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
      expect(mockGenerateImageModel).toHaveBeenCalledWith("123456");
    });
  });

  it("should extract image ID from new path format URL", async () => {
    const mockGenerateImageModel = vi.fn().mockResolvedValue(mockImageModel);
    vi.mocked(GeneratedImageModelService).mockImplementation(
      () =>
        ({
          GenerateImageModel: mockGenerateImageModel,
        } as any)
    );

    render(<ModelFromImage onModelLoaded={mockOnModelLoaded} />);

    const input = screen.getByRole("textbox");
    const button = screen.getByRole("button", { name: /Load Model/ });

    fireEvent.change(input, {
      target: {
        value: "https://civitai.com/images/60288057",
      },
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockGenerateImageModel).toHaveBeenCalledWith("60288057");
    });
  });

  it("should handle plain image ID", async () => {
    const mockGenerateImageModel = vi.fn().mockResolvedValue(mockImageModel);
    vi.mocked(GeneratedImageModelService).mockImplementation(
      () =>
        ({
          GenerateImageModel: mockGenerateImageModel,
        } as any)
    );

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
    const mockGenerateImageModel = vi.fn().mockResolvedValue(mockImageModel);
    vi.mocked(GeneratedImageModelService).mockImplementation(
      () =>
        ({
          GenerateImageModel: mockGenerateImageModel,
        } as any)
    );

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
    ).toBeInTheDocument();
  });

  it("should show error for invalid input", async () => {
    render(<ModelFromImage onModelLoaded={mockOnModelLoaded} />);

    const input = screen.getByRole("textbox");
    const button = screen.getByRole("button", { name: /Load Model/ });

    fireEvent.change(input, { target: { value: "invalid-input" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText("Please enter a valid image URL or ID")
      ).toBeInTheDocument();
    });
  });

  it("should show error when model loading fails", async () => {
    const mockGenerateImageModel = vi.fn().mockResolvedValue(null);
    vi.mocked(GeneratedImageModelService).mockImplementation(
      () =>
        ({
          GenerateImageModel: mockGenerateImageModel,
        } as any)
    );

    render(<ModelFromImage onModelLoaded={mockOnModelLoaded} />);

    const input = screen.getByRole("textbox");
    const button = screen.getByRole("button", { name: /Load Model/ });

    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load model from the provided image ID")
      ).toBeInTheDocument();
    });
  });

  it("should handle Enter key press", async () => {
    const mockGenerateImageModel = vi.fn().mockResolvedValue(mockImageModel);
    vi.mocked(GeneratedImageModelService).mockImplementation(
      () =>
        ({
          GenerateImageModel: mockGenerateImageModel,
        } as any)
    );

    render(<ModelFromImage onModelLoaded={mockOnModelLoaded} />);

    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 });

    await waitFor(() => {
      expect(mockGenerateImageModel).toHaveBeenCalledWith("123456");
    });
  });

  it("should clear input after successful load", async () => {
    const mockGenerateImageModel = vi.fn().mockResolvedValue(mockImageModel);
    vi.mocked(GeneratedImageModelService).mockImplementation(
      () =>
        ({
          GenerateImageModel: mockGenerateImageModel,
        } as any)
    );

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
    expect(button).toBeDisabled();
  });

  it("should show loading state", async () => {
    const mockGenerateImageModel = vi
      .fn()
      .mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockImageModel), 100)
          )
      );
    vi.mocked(GeneratedImageModelService).mockImplementation(
      () =>
        ({
          GenerateImageModel: mockGenerateImageModel,
        } as any)
    );

    render(<ModelFromImage onModelLoaded={mockOnModelLoaded} />);

    const input = screen.getByRole("textbox");
    const button = screen.getByRole("button", { name: /Load Model/ });

    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.click(button);

    expect(
      screen.getByText("Loading model from CivitAI...")
    ).toBeInTheDocument();
    expect(button).toBeDisabled();
  });
});
