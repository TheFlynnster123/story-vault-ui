import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LLMMessage } from "../../../services/CQRS/LLMChatProjection";
import { d } from "../../../services/Dependencies";
import type { CharacterDescription } from "./CharacterDescription";
import { ActiveCharacterSelectionService } from "./ActiveCharacterSelectionService";

vi.mock("../../../services/Dependencies");

describe("ActiveCharacterSelectionService", () => {
  const contextService = {
    buildGenerationRequestMessages: vi.fn(),
  };
  const promptsService = { Get: vi.fn() };
  const api = { postStructuredChat: vi.fn() };
  const characters = [
    createCharacter("mara", "Mara Venn"),
    createCharacter("ivo", "Ivo"),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    contextService.buildGenerationRequestMessages.mockResolvedValue([
      { id: "1", role: "user", content: "Mara confronts Talia." },
      { id: "2", role: "assistant", content: "Ivo has left the city." },
    ] satisfies LLMMessage[]);
    promptsService.Get.mockResolvedValue(undefined);
    api.postStructuredChat.mockResolvedValue({
      activeCharacterNames: ["Mara", "Talia", "Invented Stranger"],
    });
    vi.mocked(d.LLMMessageContextService).mockReturnValue(
      contextService as never,
    );
    vi.mocked(d.SystemPromptsService).mockReturnValue(promptsService as never);
    vi.mocked(d.OpenRouterChatAPI).mockReturnValue(api as never);
  });

  it("normalizes known aliases and only accepts new names grounded in recent context", async () => {
    const result = await new ActiveCharacterSelectionService("chat-1").select(
      characters,
    );

    expect(result).toEqual({
      existingCharacterIds: ["mara"],
      newCharacterNames: ["Talia"],
    });
    expect(contextService.buildGenerationRequestMessages).toHaveBeenCalledWith(
      false,
    );
  });

  it("uses only the last twelve projected scene messages", async () => {
    contextService.buildGenerationRequestMessages.mockResolvedValue([
      { role: "system", content: "Discarded prompt" },
      ...Array.from({ length: 14 }, (_, index) => ({
        id: `${index + 1}`,
        role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
        content: `Scene ${index + 1}`,
      })),
      { role: "system", content: "Trailing configured prompt" },
    ]);
    api.postStructuredChat.mockResolvedValue({ activeCharacterNames: [] });

    await new ActiveCharacterSelectionService("chat-1").select(characters);

    const requestMessages = api.postStructuredChat.mock.calls[0][0] as
      LLMMessage[] | undefined;
    expect(requestMessages?.some((message) => message.id === "1")).toBe(false);
    expect(requestMessages?.some((message) => message.id === "2")).toBe(false);
    expect(requestMessages?.some((message) => message.id === "3")).toBe(true);
    expect(
      requestMessages?.some(
        (message) => message.content === "Trailing configured prompt",
      ),
    ).toBe(false);
  });

  it("passes the configured prompt, model, and request settings", async () => {
    promptsService.Get.mockResolvedValue({
      activeCharactersPrompt: "Find the current cast.",
      activeCharactersModel: "model/active",
      activeCharactersRequestSettings: { temperature: 0.2 },
    });
    api.postStructuredChat.mockResolvedValue({ activeCharacterNames: [] });

    await new ActiveCharacterSelectionService("chat-1").select(characters);

    const call = api.postStructuredChat.mock.calls[0];
    expect(call[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "system",
          content: "Find the current cast.",
        }),
      ]),
    );
    expect(call[2]).toBe("model/active");
    expect(call[3]).toBe("Active Characters");
    expect(call[5]).toEqual({ temperature: 0.2 });
  });

  it("rejects malformed structured output instead of deactivating everyone", async () => {
    api.postStructuredChat.mockResolvedValue({
      activeCharacterNames: ["Mara", 42],
    });

    await expect(
      new ActiveCharacterSelectionService("chat-1").select(characters),
    ).rejects.toThrow("invalid character list");
  });
});

const createCharacter = (id: string, name: string): CharacterDescription => ({
  id,
  name,
  appearance: "",
  sheetItems: [],
  detectedActive: true,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
});
