import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "../../../../testing";
import { MissingCharacterDescriptionModal } from "./MissingCharacterDescriptionModal";

vi.mock("../../../Images/components/CharacterImageModelModal", () => ({
  CharacterImageModelModal: ({
    opened,
    noSelectionLabel,
    onSelect,
  }: {
    opened: boolean;
    noSelectionLabel: string;
    onSelect: (
      selection: { id: string; source: "system" } | undefined,
    ) => void;
  }) =>
    opened ? (
      <div>
        <button onClick={() => onSelect(undefined)}>{noSelectionLabel}</button>
        <button
          onClick={() => onSelect({ id: "portrait-model", source: "system" })}
        >
          Portrait Model
        </button>
      </div>
    ) : null,
}));

describe("MissingCharacterDescriptionModal", () => {
  const renderModal = (isOpen: boolean) => {
    const onGenerate = vi.fn();
    const onCreateManually = vi.fn();
    const onSkip = vi.fn();
    const onCancel = vi.fn();

    render(
      <MissingCharacterDescriptionModal
        isOpen={isOpen}
        chatId="chat-1"
        characterName="Sarah Chen"
        onGenerate={onGenerate}
        onCreateManually={onCreateManually}
        onSkip={onSkip}
        onCancel={onCancel}
      />,
    );

    return { onGenerate, onCreateManually, onSkip, onCancel };
  };

  it("does not render when closed", () => {
    renderModal(false);

    expect(
      screen.queryByText("Character appearance needed"),
    ).not.toBeInTheDocument();
  });

  it("renders options and selected character when open", () => {
    renderModal(true);

    expect(
      screen.getByText("Character appearance needed"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sarah Chen/)).toBeInTheDocument();
    expect(screen.getByText("Generate Appearance")).toBeInTheDocument();
    expect(screen.getByText("Create Manually")).toBeInTheDocument();
    expect(screen.getByText("Skip for now")).toBeInTheDocument();
  });

  it("asks for an image model before generating", async () => {
    const user = userEvent.setup();
    const { onGenerate } = renderModal(true);

    await user.click(screen.getByText("Generate Appearance"));

    expect(screen.getByText("System default")).toBeInTheDocument();
    expect(screen.getByText("Portrait Model")).toBeInTheDocument();
    expect(onGenerate).not.toHaveBeenCalled();
  });

  it("generates with the system default when no model is specified", async () => {
    const user = userEvent.setup();
    const { onGenerate } = renderModal(true);

    await user.click(screen.getByText("Generate Appearance"));
    await user.click(screen.getByText("System default"));

    expect(onGenerate).toHaveBeenCalledWith(undefined);
  });

  it("generates with the selected image model", async () => {
    const user = userEvent.setup();
    const { onGenerate } = renderModal(true);

    await user.click(screen.getByText("Generate Appearance"));
    await user.click(screen.getByText("Portrait Model"));

    expect(onGenerate).toHaveBeenCalledWith({
      id: "portrait-model",
      source: "system",
    });
  });

  it("calls onCreateManually when manual option is clicked", async () => {
    const user = userEvent.setup();
    const { onCreateManually } = renderModal(true);

    await user.click(screen.getByText("Create Manually"));

    expect(onCreateManually).toHaveBeenCalledTimes(1);
  });

  it("calls onSkip when skip option is clicked", async () => {
    const user = userEvent.setup();
    const { onSkip } = renderModal(true);

    await user.click(screen.getByText("Skip for now"));

    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
