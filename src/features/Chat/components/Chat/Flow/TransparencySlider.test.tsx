import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "../../../../../testing";
import { TransparencySlider } from "./TransparencySlider";
import { Theme } from "../../../../../components/Theme";
import { d } from "../../../../../services/Dependencies";

vi.mock("../../../../../services/Dependencies");

// Mock useChatSettings
const mockUseChatSettings = vi.fn();
vi.mock("../../../hooks/useChatSettings", () => ({
  useChatSettings: (...args: unknown[]) => mockUseChatSettings(...args),
}));

const CHAT_ID = "test-chat-789";

const defaultChatSettingsResult = {
  chatSettings: undefined,
  backgroundPhotoBase64: undefined,
  messageTransparency: Theme.chatEntry.transparency,
  isLoading: false,
};

describe("TransparencySlider", () => {
  let mockSetMessageTransparency: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSetMessageTransparency = vi.fn().mockResolvedValue(undefined);

    vi.mocked(d.ChatSettingsService).mockReturnValue({
      setMessageTransparency: mockSetMessageTransparency,
    } as any);

    mockUseChatSettings.mockReturnValue(defaultChatSettingsResult);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderSlider = () => render(<TransparencySlider chatId={CHAT_ID} />);

  it("should render the Message Transparency label", () => {
    renderSlider();

    expect(screen.getByText("Message Transparency")).toBeInTheDocument();
  });

  it("should display default transparency as percentage", () => {
    renderSlider();

    const expectedPercent = `${Math.round(Theme.chatEntry.transparency * 100)}%`;
    expect(screen.getByText(expectedPercent)).toBeInTheDocument();
  });

  it("should display saved transparency value", () => {
    mockUseChatSettings.mockReturnValue({
      ...defaultChatSettingsResult,
      messageTransparency: 0.45,
    });

    renderSlider();

    expect(screen.getByText("45%")).toBeInTheDocument();
  });

  it("should render a slider input", () => {
    renderSlider();

    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("should set slider value to saved transparency", () => {
    mockUseChatSettings.mockReturnValue({
      ...defaultChatSettingsResult,
      messageTransparency: 0.6,
    });

    renderSlider();

    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuenow", "0.6");
  });

  it("should show 0% when transparency is zero", () => {
    mockUseChatSettings.mockReturnValue({
      ...defaultChatSettingsResult,
      messageTransparency: 0,
    });

    renderSlider();

    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("should show 100% when transparency is one", () => {
    mockUseChatSettings.mockReturnValue({
      ...defaultChatSettingsResult,
      messageTransparency: 1,
    });

    renderSlider();

    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("should call useChatSettings with the provided chatId", () => {
    renderSlider();

    expect(mockUseChatSettings).toHaveBeenCalledWith(CHAT_ID);
  });
});
