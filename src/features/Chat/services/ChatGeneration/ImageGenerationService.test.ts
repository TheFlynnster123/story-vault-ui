import { describe, it, expect, beforeEach, vi } from "vitest";
import { ImageGenerationService } from "./ImageGenerationService";
import { d } from "../../../../services/Dependencies";
import type { LLMMessage } from "../../../../services/CQRS/LLMChatProjection";

vi.mock("../../../../services/Dependencies");

describe("ImageGenerationService", () => {
  const chatId = "test-chat-id";

  let service: ImageGenerationService;
  let mockImageGenerator: {
    resolveCharacterContext: ReturnType<typeof vi.fn>;
    generatePromptWithCharacterContext: ReturnType<typeof vi.fn>;
    generatePromptWithFeedback: ReturnType<typeof vi.fn>;
    triggerJob: ReturnType<typeof vi.fn>;
  };
  let mockLLMChatProjection: {
    GetMessages: ReturnType<typeof vi.fn>;
    GetMessage: ReturnType<typeof vi.fn>;
  };
  let mockUserChatProjection: {
    GetMessage: ReturnType<typeof vi.fn>;
  };
  let mockChatService: {
    CreateCivitJob: ReturnType<typeof vi.fn>;
    DeleteMessage: ReturnType<typeof vi.fn>;
  };
  let mockCharacterDescriptionGenerationService: {
    generateDescription: ReturnType<typeof vi.fn>;
  };
  let mockCharacterDescriptionsService: {
    createBlankCharacter: ReturnType<typeof vi.fn>;
    updateCharacter: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockImageGenerator = {
      resolveCharacterContext: vi.fn(),
      generatePromptWithCharacterContext: vi.fn(),
      generatePromptWithFeedback: vi.fn(),
      triggerJob: vi.fn(),
    };

    mockLLMChatProjection = {
      GetMessages: vi.fn().mockReturnValue(createMockMessages()),
      GetMessage: vi.fn(),
    };

    mockUserChatProjection = {
      GetMessage: vi.fn(),
    };

    mockChatService = {
      CreateCivitJob: vi.fn(),
      DeleteMessage: vi.fn(),
    };

    mockCharacterDescriptionGenerationService = {
      generateDescription: vi.fn(),
    };

    mockCharacterDescriptionsService = {
      createBlankCharacter: vi.fn(),
      updateCharacter: vi.fn(),
    };

    vi.mocked(d.ImageGenerator).mockReturnValue(mockImageGenerator as any);
    vi.mocked(d.LLMChatProjection).mockReturnValue(
      mockLLMChatProjection as any,
    );
    vi.mocked(d.UserChatProjection).mockReturnValue(
      mockUserChatProjection as any,
    );
    vi.mocked(d.ChatService).mockReturnValue(mockChatService as any);
    vi.mocked(d.CharacterDescriptionGenerationService).mockReturnValue(
      mockCharacterDescriptionGenerationService as any,
    );
    vi.mocked(d.CharacterDescriptionsService).mockReturnValue(
      mockCharacterDescriptionsService as any,
    );

    service = new ImageGenerationService(chatId);
  });

  it("returns missing-character-description when selected character has no description", async () => {
    mockImageGenerator.resolveCharacterContext.mockResolvedValue({
      type: "missing-description",
      characterName: "Sarah Chen",
    });

    const result = await service.generateImage();

    expect(result).toEqual({
      type: "missing-character-description",
      characterName: "Sarah Chen",
    });
    expect(
      mockImageGenerator.generatePromptWithCharacterContext,
    ).not.toHaveBeenCalled();
    expect(mockChatService.CreateCivitJob).not.toHaveBeenCalled();
  });

  it("sets loading immediately while resolving the character context", async () => {
    let resolveCharacterContext: (value: {
      type: "missing-description";
      characterName: string;
    }) => void;

    const characterContextPromise = new Promise<{
      type: "missing-description";
      characterName: string;
    }>((resolve) => {
      resolveCharacterContext = resolve;
    });

    mockImageGenerator.resolveCharacterContext.mockReturnValue(
      characterContextPromise,
    );

    const resultPromise = service.generateImage();

    expect(service.IsLoading).toBe(true);

    resolveCharacterContext!({
      type: "missing-description",
      characterName: "Sarah Chen",
    });

    await expect(resultPromise).resolves.toEqual({
      type: "missing-character-description",
      characterName: "Sarah Chen",
    });
    expect(service.IsLoading).toBe(false);
  });

  it("generates image immediately when character description already exists", async () => {
    mockImageGenerator.resolveCharacterContext.mockResolvedValue({
      type: "existing-description",
      characterName: "Sarah Chen",
      description: "Dark hair, green eyes",
    });
    mockImageGenerator.generatePromptWithCharacterContext.mockResolvedValue(
      "image prompt",
    );
    mockImageGenerator.triggerJob.mockResolvedValue("job-1");

    const result = await service.generateImage();

    expect(result).toEqual({ type: "started" });
    expect(
      mockImageGenerator.generatePromptWithCharacterContext,
    ).toHaveBeenCalled();
    expect(mockChatService.CreateCivitJob).toHaveBeenCalledWith(
      "job-1",
      "image prompt",
    );
  });

  it("supports manual path for missing descriptions", async () => {
    mockCharacterDescriptionsService.createBlankCharacter.mockResolvedValue({
      id: "char-1",
      name: "Sarah Chen",
      description: "",
    });

    const result = await service.resolveMissingCharacterDescription(
      "Sarah Chen",
      "manual",
    );

    expect(result).toEqual({
      type: "navigate-to-character-descriptions",
      characterName: "Sarah Chen",
    });
    expect(
      mockCharacterDescriptionsService.createBlankCharacter,
    ).toHaveBeenCalledWith("Sarah Chen");
    expect(
      mockImageGenerator.generatePromptWithCharacterContext,
    ).not.toHaveBeenCalled();
  });

  it("supports skip path for missing descriptions and generates image", async () => {
    mockCharacterDescriptionsService.createBlankCharacter.mockResolvedValue({
      id: "char-1",
      name: "Sarah Chen",
      description: "",
    });
    mockImageGenerator.generatePromptWithCharacterContext.mockResolvedValue(
      "image prompt",
    );
    mockImageGenerator.triggerJob.mockResolvedValue("job-2");

    const result = await service.resolveMissingCharacterDescription(
      "Sarah Chen",
      "skip",
    );

    expect(result).toEqual({ type: "started" });
    expect(
      mockCharacterDescriptionsService.createBlankCharacter,
    ).toHaveBeenCalledWith("Sarah Chen");
    expect(
      mockImageGenerator.generatePromptWithCharacterContext,
    ).toHaveBeenCalledWith(createMockMessages(), { type: "none" });
    expect(mockChatService.CreateCivitJob).toHaveBeenCalledWith(
      "job-2",
      "image prompt",
    );
  });

  it("supports AI generation path for missing descriptions and generates image", async () => {
    mockCharacterDescriptionGenerationService.generateDescription.mockResolvedValue(
      "Dark hair, green eyes, narrow jawline",
    );
    mockCharacterDescriptionsService.createBlankCharacter.mockResolvedValue({
      id: "char-1",
      name: "Sarah Chen",
      description: "",
    });
    mockImageGenerator.generatePromptWithCharacterContext.mockResolvedValue(
      "image prompt",
    );
    mockImageGenerator.triggerJob.mockResolvedValue("job-3");

    const result = await service.resolveMissingCharacterDescription(
      "Sarah Chen",
      "generate",
    );

    expect(result).toEqual({ type: "started" });
    expect(
      mockCharacterDescriptionGenerationService.generateDescription,
    ).toHaveBeenCalledWith("Sarah Chen");
    expect(
      mockCharacterDescriptionsService.createBlankCharacter,
    ).toHaveBeenCalledWith("Sarah Chen");
    expect(
      mockCharacterDescriptionsService.updateCharacter,
    ).toHaveBeenCalledWith("char-1", {
      description: "Dark hair, green eyes, narrow jawline",
    });
    expect(
      mockImageGenerator.generatePromptWithCharacterContext,
    ).toHaveBeenCalledWith(createMockMessages(), {
      type: "existing-description",
      characterName: "Sarah Chen",
      description: "Dark hair, green eyes, narrow jawline",
    });
    expect(mockChatService.CreateCivitJob).toHaveBeenCalledWith(
      "job-3",
      "image prompt",
    );
  });
});

const createMockMessages = (): LLMMessage[] => [
  {
    id: "m-1",
    role: "user",
    content: "Sarah steps into the moonlit courtyard.",
  },
  {
    id: "m-2",
    role: "assistant",
    content: "She scans the shadows for movement.",
  },
];
