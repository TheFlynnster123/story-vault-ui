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
    GetMessages: ReturnType<typeof vi.fn>;
  };
  let mockCivitMessage: any;
  let mockChatService: {
    CreateCivitJob: ReturnType<typeof vi.fn>;
    UpdateCivitJob: ReturnType<typeof vi.fn>;
    DeleteMessage: ReturnType<typeof vi.fn>;
  };
  let mockCharacterDescriptionGenerationService: {
    generateDescription: ReturnType<typeof vi.fn>;
  };
  let mockCharacterDescriptionsService: {
    createBlankCharacter: ReturnType<typeof vi.fn>;
    updateCharacter: ReturnType<typeof vi.fn>;
    findByName: ReturnType<typeof vi.fn>;
  };
  let mockChatImageVariantService: {
    getSelectedModelOrDefault: ReturnType<typeof vi.fn>;
    GetAll: ReturnType<typeof vi.fn>;
  };
  let mockImageModelService: {
    GetAllImageModels: ReturnType<typeof vi.fn>;
  };
  let mockErrorService: {
    log: ReturnType<typeof vi.fn>;
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
      GetMessages: vi.fn().mockReturnValue([]),
    };

    mockChatService = {
      CreateCivitJob: vi.fn(),
      UpdateCivitJob: vi.fn(),
      DeleteMessage: vi.fn(),
    };
    mockCivitMessage = undefined;
    mockChatService.CreateCivitJob.mockImplementation(
      (jobId: string, prompt: string, extras?: any) => {
        mockCivitMessage = {
          id: jobId,
          type: "civit-job",
          data: {
            jobId,
            prompt,
            ...extras,
          },
        };
      },
    );
    mockChatService.UpdateCivitJob.mockImplementation(
      (_messageId: string, patch: any) => {
        if (mockCivitMessage) {
          mockCivitMessage = {
            ...mockCivitMessage,
            data: {
              ...mockCivitMessage.data,
              ...patch,
            },
          };
        }
      },
    );
    mockUserChatProjection.GetMessage.mockImplementation(
      (messageId: string) =>
        mockCivitMessage?.id === messageId ? mockCivitMessage : undefined,
    );

    mockCharacterDescriptionGenerationService = {
      generateDescription: vi.fn(),
    };

    mockCharacterDescriptionsService = {
      createBlankCharacter: vi.fn(),
      updateCharacter: vi.fn(),
      findByName: vi.fn().mockResolvedValue(undefined),
    };
    mockChatImageVariantService = {
      getSelectedModelOrDefault: vi
        .fn()
        .mockResolvedValue({ id: "model-default", name: "Default Model" }),
      GetAll: vi.fn().mockResolvedValue({ variants: [] }),
    };
    mockImageModelService = {
      GetAllImageModels: vi.fn().mockResolvedValue({ models: [] }),
    };
    mockErrorService = {
      log: vi.fn(),
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
    vi.mocked(d.ChatImageVariantService).mockReturnValue(
      mockChatImageVariantService as any,
    );
    vi.mocked(d.ImageModelService).mockReturnValue(mockImageModelService as any);
    vi.mocked(d.ErrorService).mockReturnValue(mockErrorService as any);
    vi.mocked(d.ChatEventService).mockReturnValue({
      Initialize: vi.fn().mockResolvedValue(undefined),
    } as any);
    localStorage.clear();

    service = new ImageGenerationService(chatId);
  });

  it("creates a pending image message immediately when selected character has no description", async () => {
    mockImageGenerator.resolveCharacterContext.mockResolvedValue({
      type: "missing-description",
      characterName: "Sarah Chen",
    });

    const result = await service.generateImage();

    expect(result).toEqual({ type: "started" });
    expect(mockChatService.CreateCivitJob).toHaveBeenCalledWith(
      expect.stringMatching(/^image-gen-/),
      "",
      { generationStatus: "determining-character" },
    );

    await vi.waitFor(() => {
      expect(mockChatService.UpdateCivitJob).toHaveBeenCalledWith(
        expect.stringMatching(/^image-gen-/),
        expect.objectContaining({
          generationStatus: "missing-character-description",
          characterName: "Sarah Chen",
          modelName: "Default Model",
        }),
      );
    });
    expect(service.PendingMissingCharacter).toEqual({
      messageId: expect.stringMatching(/^image-gen-/),
      characterName: "Sarah Chen",
    });
    expect(
      mockImageGenerator.generatePromptWithCharacterContext,
    ).not.toHaveBeenCalled();
  });

  it("returns immediately while resolving the character context in the background", async () => {
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

    await expect(resultPromise).resolves.toEqual({ type: "started" });
    expect(service.IsLoading).toBe(false);

    resolveCharacterContext!({
      type: "missing-description",
      characterName: "Sarah Chen",
    });

    await vi.waitFor(() => {
      expect(mockChatService.UpdateCivitJob).toHaveBeenCalledWith(
        expect.stringMatching(/^image-gen-/),
        expect.objectContaining({
          generationStatus: "missing-character-description",
        }),
      );
    });
  });

  it("resumes pending generation when a stale refresh lease is present", async () => {
    const messageId = "image-gen-stale";
    mockCivitMessage = {
      id: messageId,
      type: "civit-job",
      data: {
        jobId: messageId,
        prompt: "",
        generationStatus: "determining-character",
      },
    };
    mockUserChatProjection.GetMessages.mockReturnValue([mockCivitMessage]);
    localStorage.setItem(
      `story-vault:image-generation-lease:${chatId}:${messageId}`,
      String(Date.now() + 120_000),
    );
    mockImageGenerator.resolveCharacterContext.mockResolvedValue({
      type: "existing-description",
      characterName: "Sarah Chen",
      description: "Dark hair, green eyes",
    });
    mockImageGenerator.generatePromptWithCharacterContext.mockResolvedValue(
      "image prompt",
    );
    mockImageGenerator.triggerJob.mockResolvedValue({
      jobId: "job-resumed",
      modelName: "Test Model",
      fullPrompt: "full combined prompt",
      basePrompt: "base prompt",
      sceneDescription: "image prompt",
    });

    await service.resumePendingGenerations();

    await vi.waitFor(() => {
      expect(mockImageGenerator.resolveCharacterContext).toHaveBeenCalled();
      expect(mockChatService.UpdateCivitJob).toHaveBeenCalledWith(
        messageId,
        expect.objectContaining({
          jobId: "job-resumed",
          generationStatus: "submitted",
        }),
      );
    });
  });

  it("creates a pending message immediately and submits image in the background", async () => {
    mockImageGenerator.resolveCharacterContext.mockResolvedValue({
      type: "existing-description",
      characterName: "Sarah Chen",
      description: "Dark hair, green eyes",
    });
    mockImageGenerator.generatePromptWithCharacterContext.mockResolvedValue(
      "image prompt",
    );
    mockImageGenerator.triggerJob.mockImplementation(
      async (_prompt, _preferred, _description, onPromptPrepared) => {
        await onPromptPrepared?.({
          modelName: "Test Model",
          fullPrompt: "full combined prompt",
          basePrompt: "base prompt",
          sceneDescription: "image prompt",
        });
        return {
          jobId: "job-1",
          modelName: "Test Model",
          fullPrompt: "full combined prompt",
          basePrompt: "base prompt",
          sceneDescription: "image prompt",
        };
      },
    );

    const submittingPatch = expect.objectContaining({
      prompt: "full combined prompt",
      basePrompt: "base prompt",
      sceneDescription: "image prompt",
      modelName: "Test Model",
      generationStatus: "submitting",
    });

    const result = await service.generateImage();

    expect(result).toEqual({ type: "started" });
    const messageId = mockChatService.CreateCivitJob.mock.calls[0][0];

    await vi.waitFor(() => {
      expect(
        mockImageGenerator.generatePromptWithCharacterContext,
      ).toHaveBeenCalled();
      expect(mockChatService.UpdateCivitJob).toHaveBeenCalledWith(
        messageId,
        submittingPatch,
      );
      expect(mockChatService.UpdateCivitJob).toHaveBeenCalledWith(
        messageId,
        expect.objectContaining({
          jobId: "job-1",
          prompt: "full combined prompt",
          modelName: "Test Model",
          generationStatus: "submitted",
        }),
      );
    });
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
    mockImageGenerator.triggerJob.mockResolvedValue({
      jobId: "job-2",
      modelName: "Test Model",
      fullPrompt: "full combined prompt",
    });

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
      "full combined prompt",
      expect.objectContaining({ modelName: "Test Model" }),
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
    mockImageGenerator.triggerJob.mockResolvedValue({
      jobId: "job-3",
      modelName: "Test Model",
      fullPrompt: "full combined prompt",
    });

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
      "full combined prompt",
      expect.objectContaining({ modelName: "Test Model" }),
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
