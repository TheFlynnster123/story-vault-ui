import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImageModelFromGeneratedImageService } from "./ImageModelFromGeneratedImageService";
import { d } from "../../Dependencies";

vi.mock("../../Dependencies", () => ({
  d: {
    ImageIdExtractor: vi.fn(),
    GeneratedImageQuery: vi.fn(),
    ImageModelMapper: vi.fn(),
  },
}));

describe("ImageModelFromGeneratedImageService", () => {
  let service: ImageModelFromGeneratedImageService;
  let mockExtractor: any;
  let mockQuery: any;
  let mockMapper: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockExtractor = { extract: vi.fn() };
    mockQuery = { Get: vi.fn() };
    mockMapper = { FromGeneratedImage: vi.fn() };

    (d.ImageIdExtractor as any).mockReturnValue(mockExtractor);
    (d.GeneratedImageQuery as any).mockReturnValue(mockQuery);
    (d.ImageModelMapper as any).mockReturnValue(mockMapper);

    service = new ImageModelFromGeneratedImageService();
  });

  it("should call extract with provided input", async () => {
    mockExtractor.extract.mockReturnValue("123");
    mockQuery.Get.mockResolvedValue({ type: "image" });
    mockMapper.FromGeneratedImage.mockReturnValue({});

    await service.GenerateImageModel("123");

    expect(mockExtractor.extract).toHaveBeenCalledWith("123");
  });

  it("should call Get with extracted imageId", async () => {
    mockExtractor.extract.mockReturnValue("123");
    mockQuery.Get.mockResolvedValue({ type: "image" });
    mockMapper.FromGeneratedImage.mockReturnValue({});

    await service.GenerateImageModel("https://example.com/123");

    expect(mockQuery.Get).toHaveBeenCalledWith("123");
  });

  it("should call FromGeneratedImage with queried data", async () => {
    const mockGeneratedImage = { type: "image", remixOf: { id: 123 } };
    mockExtractor.extract.mockReturnValue("123");
    mockQuery.Get.mockResolvedValue(mockGeneratedImage);
    mockMapper.FromGeneratedImage.mockReturnValue({});

    await service.GenerateImageModel("123");

    expect(mockMapper.FromGeneratedImage).toHaveBeenCalledWith(
      mockGeneratedImage
    );
  });

  it("should throw error when imageId extraction fails", async () => {
    mockExtractor.extract.mockReturnValue(undefined);

    await expect(service.GenerateImageModel("invalid")).rejects.toThrow(
      "Could not get an image Id from the provided input!"
    );

    expect(mockQuery.Get).not.toHaveBeenCalled();
  });

  it("should throw error when query returns no image", async () => {
    mockExtractor.extract.mockReturnValue("123");
    mockQuery.Get.mockResolvedValue(undefined);

    await expect(service.GenerateImageModel("123")).rejects.toThrow(
      "Could not fetch generated image data from the provided ID!"
    );

    expect(mockMapper.FromGeneratedImage).not.toHaveBeenCalled();
  });
});
