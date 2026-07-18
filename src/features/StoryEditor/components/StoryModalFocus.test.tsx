import { afterEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  userEvent,
  waitForElementToBeRemoved,
  within,
} from "../../../testing";
import { StoryDiscussionModal } from "./StoryDiscussionModal";
import { StoryGeneratorModal } from "./StoryGeneratorModal";
import { useSystemSettings } from "../../SystemSettings/hooks/useSystemSettings";
import { useSystemPrompts } from "../../Prompts/hooks/useSystemPrompts";
import { DEFAULT_SYSTEM_PROMPTS } from "../../Prompts/services/SystemPrompts";

vi.mock("../../AI/components/ModelSelect", () => ({
  ModelSelect: () => <div>Model select</div>,
}));

vi.mock("../../SystemSettings/hooks/useSystemSettings");
vi.mock("../../Prompts/hooks/useSystemPrompts");

describe("story modal focus restoration", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["story generator", <StoryGeneratorModal />],
    [
      "story discussion",
      <StoryDiscussionModal onStoryGenerated={vi.fn()} />,
    ],
  ])("restores %s trigger focus without scrolling", async (_, modal) => {
    vi.mocked(useSystemSettings).mockReturnValue({
      systemSettings: undefined,
      isLoading: false,
      saveSystemSettings: vi.fn(),
    });
    vi.mocked(useSystemPrompts).mockReturnValue({
      systemPrompts: DEFAULT_SYSTEM_PROMPTS,
      isLoading: false,
      saveSystemPrompts: vi.fn(),
    });
    const user = userEvent.setup();

    render(modal);

    const trigger = screen.getByRole("button", { name: "Generate" });
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog");
    const focusSpy = vi.spyOn(trigger, "focus");
    await user.click(within(dialog).getByRole("button", { name: "" }));

    await waitForElementToBeRemoved(dialog);
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    expect(trigger).toHaveFocus();
    focusSpy.mockRestore();
  });
});
