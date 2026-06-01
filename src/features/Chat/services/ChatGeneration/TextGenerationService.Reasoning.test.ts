import { beforeEach, describe, expect, it, vi } from "vitest";
import { d } from "../../../../services/Dependencies";
import { TextGenerationService } from "./TextGenerationService";

vi.mock("../../../../services/Dependencies");

const CHAT_ID = "chat-1";

describe("TextGenerationService reasoning", () => {
  const mockRequestMessages = [{ role: "user" as const, content: "Hello" }];
  const mockReasoningMessages = [
    { role: "system" as const, content: "Reason first" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(d.PlanGenerationService).mockReturnValue({
      onMessageSent: vi.fn(),
    } as unknown as ReturnType<typeof d.PlanGenerationService>);

    vi.mocked(d.ChatSettingsService).mockReturnValue({
      Get: vi.fn().mockResolvedValue({ reasoningEnabled: true }),
    } as unknown as ReturnType<typeof d.ChatSettingsService>);

    vi.mocked(d.LLMMessageContextService).mockReturnValue({
      buildReasoningRequestMessages: vi
        .fn()
        .mockResolvedValue(mockReasoningMessages),
      buildGenerationRequestMessages: vi.fn().mockResolvedValue(mockRequestMessages),
    } as unknown as ReturnType<typeof d.LLMMessageContextService>);

    vi.mocked(d.UserChatProjection).mockReturnValue({
      addStreamingMessage: vi.fn(),
      updateStreamingMessage: vi.fn(),
      removeStreamingMessage: vi.fn(),
    } as unknown as ReturnType<typeof d.UserChatProjection>);

    vi.mocked(d.OpenRouterChatAPI).mockReturnValue({
      postChat: vi.fn().mockResolvedValue("Reasoning output"),
      postChatStream: vi.fn().mockResolvedValue("Assistant output"),
    } as unknown as ReturnType<typeof d.OpenRouterChatAPI>);

    vi.mocked(d.ChatService).mockReturnValue({
      AddReasoningMessage: vi.fn().mockResolvedValue(undefined),
      AddAssistantMessage: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof d.ChatService>);
  });

  it("generates and saves reasoning before the assistant response when enabled", async () => {
    const service = new TextGenerationService(CHAT_ID);

    await service.generateResponse();

    expect(
      d.LLMMessageContextService(CHAT_ID).buildReasoningRequestMessages,
    ).toHaveBeenCalled();
    expect(d.OpenRouterChatAPI().postChat).toHaveBeenCalledWith(
      mockReasoningMessages,
      undefined,
      "chat",
      "Reasoning",
      undefined,
    );
    expect(d.ChatService(CHAT_ID).AddReasoningMessage).toHaveBeenCalledWith(
      "Reasoning output",
    );
    expect(d.OpenRouterChatAPI().postChatStream).toHaveBeenCalled();
  });

  it("skips the reasoning request when reasoning is disabled", async () => {
    vi.mocked(d.ChatSettingsService).mockReturnValue({
      Get: vi.fn().mockResolvedValue({ reasoningEnabled: false }),
    } as unknown as ReturnType<typeof d.ChatSettingsService>);
    const service = new TextGenerationService(CHAT_ID);

    await service.generateResponse();

    expect(
      d.LLMMessageContextService(CHAT_ID).buildReasoningRequestMessages,
    ).not.toHaveBeenCalled();
    expect(d.OpenRouterChatAPI().postChat).not.toHaveBeenCalled();
    expect(d.ChatService(CHAT_ID).AddReasoningMessage).not.toHaveBeenCalled();
    expect(d.OpenRouterChatAPI().postChatStream).toHaveBeenCalled();
  });
});
