import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "../../../../testing";
import { MissingCharacterDescriptionModal } from "./MissingCharacterDescriptionModal";

describe("MissingCharacterDescriptionModal", () => {
  const renderModal = (isOpen: boolean) => {
    const onGenerate = vi.fn();
    const onCreateManually = vi.fn();
    const onSkip = vi.fn();
    const onCancel = vi.fn();

    render(
      <MissingCharacterDescriptionModal
        isOpen={isOpen}
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
      screen.queryByText("Character description needed"),
    ).not.toBeInTheDocument();
  });

  it("renders options and selected character when open", () => {
    renderModal(true);

    expect(
      screen.getByText("Character description needed"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sarah Chen/)).toBeInTheDocument();
    expect(screen.getByText("Generate Description")).toBeInTheDocument();
    expect(screen.getByText("Create Manually")).toBeInTheDocument();
    expect(screen.getByText("Skip for now")).toBeInTheDocument();
  });

  it("calls onGenerate when generate option is clicked", async () => {
    const user = userEvent.setup();
    const { onGenerate } = renderModal(true);

    await user.click(screen.getByText("Generate Description"));

    expect(onGenerate).toHaveBeenCalledTimes(1);
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
