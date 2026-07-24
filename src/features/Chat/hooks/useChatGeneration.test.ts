import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { d } from "../../../services/Dependencies";
import type { useChatGeneration as UseChatGenerationType } from "./useChatGeneration";

vi.mock("../../../services/Dependencies");

const CHAT_ID = "chat-1";

const createMockTextGenerationService = () => ({
  subscribe: vi.fn().mockReturnValue(vi.fn()),
  generateResponse: vi.fn().mockResolvedValue("response"),
  regenerateResponse: vi.fn().mockResolvedValue("response"),
  IsLoading: false,
  Status: undefined,
});

const createMockImageGenerationService = () => ({
  subscribe: vi.fn().mockReturnValue(vi.fn()),
  generateImage: vi
    .fn()
    .mockResolvedValue({
      type: "missing-character-description",
      characterName: "Sarah Chen",
    }),
  resolveMissingCharacterDescription: vi
    .fn()
    .mockResolvedValue({ type: "started" }),
  IsLoading: false,
});

const importHook = async () => {
  const mod = await import("./useChatGeneration");
  return mod.useChatGeneration;
};

describe("useChatGeneration", () => {
  let mockTextGeneration: ReturnType<typeof createMockTextGenerationService>;
  let mockImageGeneration: ReturnType<typeof createMockImageGenerationService>;
  let mockErrorLog: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTextGeneration = createMockTextGenerationService();
    mockImageGeneration = createMockImageGenerationService();
    mockErrorLog = vi.fn();

    vi.mocked(d.TextGenerationService).mockReturnValue(
      mockTextGeneration as unknown as ReturnType<
        typeof d.TextGenerationService
      >,
    );
    vi.mocked(d.ImageGenerationService).mockReturnValue(
      mockImageGeneration as unknown as ReturnType<
        typeof d.ImageGenerationService
      >,
    );
    vi.mocked(d.ErrorService).mockReturnValue({
      log: mockErrorLog,
    } as unknown as ReturnType<typeof d.ErrorService>);
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const renderChatGeneration = async () => {
    const useChatGeneration = await importHook();
    return renderHook(() => useChatGeneration(CHAT_ID));
  };

  const triggerMissingCharacterState = async (
    result: { current: ReturnType<typeof UseChatGenerationType> },
    characterName = "Sarah Chen",
  ) => {
    mockImageGeneration.generateImage.mockResolvedValue({
      type: "missing-character-description",
      characterName,
    });
    await act(async () => {
      result.current.generateImage();
    });
    // Flush the .then() microtask so React state is updated
    await act(async () => {});
  };

  // ---------------------------------------------------------------------------
  // generateResponse
  // ---------------------------------------------------------------------------

  describe("generateResponse", () => {
    it("passes user input and guidance to the generation service", async () => {
      const { result } = await renderChatGeneration();

      await act(async () => {
        await result.current.generateResponse(
          "Follow-up message",
          "Keep it tense",
        );
      });

      expect(mockTextGeneration.generateResponse).toHaveBeenCalledWith(
        "Follow-up message",
        "Keep it tense",
      );
    });

    it("passes an empty continuation to the generation service", async () => {
      const { result } = await renderChatGeneration();

      await act(async () => {
        await result.current.generateResponse("");
      });

      expect(mockTextGeneration.generateResponse).toHaveBeenCalledWith(
        "",
        undefined,
      );
    });

    it("returns an empty response when generation fails", async () => {
      const error = new Error("generation failed");
      mockTextGeneration.generateResponse.mockRejectedValue(error);
      const { result } = await renderChatGeneration();
      let response = "not-empty";

      await act(async () => {
        response = await result.current.generateResponse("Follow-up message");
      });

      expect(response).toBe("");
      expect(mockErrorLog).toHaveBeenCalledWith(
        "Failed to generate response",
        error,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // generateImage
  // ---------------------------------------------------------------------------

  describe("generateImage", () => {
    it("sets missingCharacterName when the result is missing-character-description", async () => {
      const { result } = await renderChatGeneration();

      await triggerMissingCharacterState(result);

      expect(result.current.missingCharacterName).toBe("Sarah Chen");
    });

    it("leaves missingCharacterName null for other result types", async () => {
      mockImageGeneration.generateImage.mockResolvedValue({ type: "started" });
      const { result } = await renderChatGeneration();

      await act(async () => {
        result.current.generateImage();
      });
      await act(async () => {});

      expect(result.current.missingCharacterName).toBeNull();
    });

    it("logs unhandled errors via ErrorService", async () => {
      const err = new Error("image failed");
      mockImageGeneration.generateImage.mockRejectedValue(err);
      const { result } = await renderChatGeneration();

      await act(async () => {
        result.current.generateImage();
      });
      await act(async () => {});

      expect(mockErrorLog).toHaveBeenCalledWith(
        "Failed to generate image",
        err,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // resolveMissingCharacterDescription — "generate" (fire-and-forget)
  // ---------------------------------------------------------------------------

  describe("resolveMissingCharacterDescription('generate')", () => {
    it("closes the modal immediately without waiting for generation to complete", async () => {
      const { result } = await renderChatGeneration();
      await triggerMissingCharacterState(result);
      expect(result.current.missingCharacterName).toBe("Sarah Chen");

      // Make the service call slow so we can verify the modal closes before it finishes
      let resolveGeneration!: () => void;
      mockImageGeneration.resolveMissingCharacterDescription.mockReturnValue(
        new Promise((resolve) => {
          resolveGeneration = () => resolve({ type: "started" });
        }),
      );

      let returned!: string;
      await act(async () => {
        returned =
          await result.current.resolveMissingCharacterDescription("generate");
      });

      // Modal is already closed before the slow generation completes
      expect(returned).toBe("none");
      expect(result.current.missingCharacterName).toBeNull();

      // Service was invoked with correct args
      expect(
        mockImageGeneration.resolveMissingCharacterDescription,
      ).toHaveBeenCalledWith("Sarah Chen", "generate");

      // Resolve the background work so the promise doesn't stay dangling
      resolveGeneration();
    });

    it("returns 'none' immediately", async () => {
      const { result } = await renderChatGeneration();
      await triggerMissingCharacterState(result);

      let returned!: string;
      await act(async () => {
        returned =
          await result.current.resolveMissingCharacterDescription("generate");
      });

      expect(returned).toBe("none");
    });

    it("logs errors from background generation via ErrorService", async () => {
      const err = new Error("LLM failed");
      mockImageGeneration.resolveMissingCharacterDescription.mockRejectedValue(
        err,
      );

      const { result } = await renderChatGeneration();
      await triggerMissingCharacterState(result);

      await act(async () => {
        await result.current.resolveMissingCharacterDescription("generate");
      });
      // Flush the .catch() microtask
      await act(async () => {});

      expect(mockErrorLog).toHaveBeenCalledWith(
        "Failed to generate character description and image",
        err,
      );
    });

    it("returns 'none' even when missingCharacterName is null", async () => {
      const { result } = await renderChatGeneration();

      let returned!: string;
      await act(async () => {
        returned =
          await result.current.resolveMissingCharacterDescription("generate");
      });

      expect(returned).toBe("none");
      expect(
        mockImageGeneration.resolveMissingCharacterDescription,
      ).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // resolveMissingCharacterDescription — "manual" (still awaited)
  // ---------------------------------------------------------------------------

  describe("resolveMissingCharacterDescription('manual')", () => {
    it("returns 'navigate-to-characters' and clears the modal", async () => {
      mockImageGeneration.resolveMissingCharacterDescription.mockResolvedValue({
        type: "navigate-to-character-descriptions",
        characterName: "Sarah Chen",
      });

      const { result } = await renderChatGeneration();
      await triggerMissingCharacterState(result);

      let returned!: string;
      await act(async () => {
        returned =
          await result.current.resolveMissingCharacterDescription("manual");
      });

      expect(returned).toBe("navigate-to-characters");
      expect(result.current.missingCharacterName).toBeNull();
    });

    it("returns 'none' for non-navigate results", async () => {
      mockImageGeneration.resolveMissingCharacterDescription.mockResolvedValue({
        type: "started",
      });

      const { result } = await renderChatGeneration();
      await triggerMissingCharacterState(result);

      let returned!: string;
      await act(async () => {
        returned =
          await result.current.resolveMissingCharacterDescription("manual");
      });

      expect(returned).toBe("none");
    });

    it("logs and returns 'none' on error", async () => {
      const err = new Error("manual failed");
      mockImageGeneration.resolveMissingCharacterDescription.mockRejectedValue(
        err,
      );

      const { result } = await renderChatGeneration();
      await triggerMissingCharacterState(result);

      let returned!: string;
      await act(async () => {
        returned =
          await result.current.resolveMissingCharacterDescription("manual");
      });

      expect(returned).toBe("none");
      expect(mockErrorLog).toHaveBeenCalledWith(
        "Failed to resolve missing character description",
        err,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // resolveMissingCharacterDescription — "skip" (still awaited)
  // ---------------------------------------------------------------------------

  describe("resolveMissingCharacterDescription('skip')", () => {
    it("clears missingCharacterName after skip resolves", async () => {
      const { result } = await renderChatGeneration();
      await triggerMissingCharacterState(result);

      await act(async () => {
        await result.current.resolveMissingCharacterDescription("skip");
      });

      expect(result.current.missingCharacterName).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // dismissMissingCharacterDescription
  // ---------------------------------------------------------------------------

  describe("dismissMissingCharacterDescription", () => {
    it("clears missingCharacterName", async () => {
      const { result } = await renderChatGeneration();
      await triggerMissingCharacterState(result);
      expect(result.current.missingCharacterName).toBe("Sarah Chen");

      act(() => {
        result.current.dismissMissingCharacterDescription();
      });

      expect(result.current.missingCharacterName).toBeNull();
    });
  });
});
