import { beforeEach, describe, expect, it, vi } from "vitest";
import { d } from "../../../services/Dependencies";
import { CharacterSheetGenerationService } from "./CharacterSheetGenerationService";

vi.mock("../../../services/Dependencies");

const CHAT_ID = "chat-1";

describe("CharacterSheetGenerationService", () => {
  const updateSettings = vi.fn().mockResolvedValue(undefined);
  const getSettings = vi.fn();
  const postStructuredChat = vi.fn();
  const upsertGeneratedSheet = vi.fn();
  const errorLog = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getSettings.mockResolvedValue({
      characterSheetsAutoGenerateEnabled: true,
      characterSheetsCheckInterval: 3,
      characterSheetsMessagesSinceLastCheck: 0,
    });
    postStructuredChat.mockResolvedValue({ newCharacters: [] });
    upsertGeneratedSheet.mockResolvedValue(undefined);

    vi.mocked(d.ChatSettingsService).mockReturnValue({
      Get: getSettings,
      update: updateSettings,
    } as never);
    vi.mocked(d.CharacterDescriptionsService).mockReturnValue({
      get: vi.fn().mockResolvedValue([
        { id: "c-1", name: "Mara", appearance: "dark curls", createdAt: "x", updatedAt: "x" },
      ]),
      upsertGeneratedSheet,
    } as never);
    vi.mocked(d.LLMMessageContextService).mockReturnValue({
      buildGenerationRequestMessages: vi
        .fn()
        .mockResolvedValue([{ role: "user", content: "Mara arrives." }]),
    } as never);
    vi.mocked(d.SystemPromptsService).mockReturnValue({
      Get: vi.fn().mockResolvedValue(undefined),
    } as never);
    vi.mocked(d.OpenRouterChatAPI).mockReturnValue({
      postStructuredChat,
    } as never);
    vi.mocked(d.ErrorService).mockReturnValue({ log: errorLog } as never);
  });

  it("increments the counter without calling the model before the configured interval", async () => {
    getSettings.mockResolvedValue({
      characterSheetsAutoGenerateEnabled: true,
      characterSheetsCheckInterval: 3,
      characterSheetsMessagesSinceLastCheck: 1,
    });

    const result = await new CharacterSheetGenerationService(
      CHAT_ID,
    ).maybeGenerateForNewPrimaryCharacters();

    expect(result).toBe(0);
    expect(updateSettings).toHaveBeenCalledWith({
      characterSheetsMessagesSinceLastCheck: 2,
    });
    expect(postStructuredChat).not.toHaveBeenCalled();
  });

  it("generates structured sheets and resets the counter when the interval is reached", async () => {
    getSettings.mockResolvedValue({
      characterSheetsAutoGenerateEnabled: true,
      characterSheetsCheckInterval: 3,
      characterSheetsMessagesSinceLastCheck: 2,
    });
    postStructuredChat.mockResolvedValue({
      newCharacters: [{ name: "Elian", sheet: "A loyal navigator." }],
    });
    upsertGeneratedSheet.mockResolvedValue({ id: "c-2" });

    const result = await new CharacterSheetGenerationService(
      CHAT_ID,
    ).maybeGenerateForNewPrimaryCharacters();

    expect(result).toBe(1);
    expect(updateSettings).toHaveBeenCalledWith({
      characterSheetsMessagesSinceLastCheck: 0,
    });
    expect(postStructuredChat).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ content: expect.stringContaining("Known character names: Mara") }),
      ]),
      expect.objectContaining({ json_schema: expect.objectContaining({ name: "new_primary_character_sheets" }) }),
      expect.anything(),
      "Character Sheets",
      false,
      undefined,
      "chat",
    );
    expect(upsertGeneratedSheet).toHaveBeenCalledWith(
      "Elian",
      "A loyal navigator.",
    );
  });

  it("does nothing when automatic character sheets are disabled", async () => {
    getSettings.mockResolvedValue({ characterSheetsAutoGenerateEnabled: false });

    await new CharacterSheetGenerationService(
      CHAT_ID,
    ).maybeGenerateForNewPrimaryCharacters();

    expect(updateSettings).not.toHaveBeenCalled();
    expect(postStructuredChat).not.toHaveBeenCalled();
  });

  it("fails open when manual generation cannot call the model", async () => {
    postStructuredChat.mockRejectedValue(new Error("network"));

    const result = await new CharacterSheetGenerationService(
      CHAT_ID,
    ).generateNow();

    expect(result).toBe(0);
    expect(errorLog).toHaveBeenCalledWith(
      "Failed to generate character sheets",
      expect.any(Error),
    );
  });
});
