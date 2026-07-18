import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "../../../../../testing";
import { CreateChapterModal } from "./CreateChapterModal";

const defaultProps = {
  opened: true,
  title: "",
  summary: "",
  isGenerating: false,
  isCreating: false,
  onTitleChange: vi.fn(),
  onSummaryChange: vi.fn(),
  onGenerate: vi.fn(),
  onDiscuss: vi.fn(),
  onManual: vi.fn(),
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
  onDiscard: vi.fn(),
};

describe("CreateChapterModal", () => {
  it("offers discuss, generate, and manual creation choices", async () => {
    const user = userEvent.setup();
    render(<CreateChapterModal {...defaultProps} view="choices" />);

    await user.click(screen.getByRole("button", { name: "Discuss" }));
    await user.click(screen.getByRole("button", { name: "Generate" }));
    await user.click(screen.getByRole("button", { name: "Manual" }));

    const generate = screen.getByRole("button", { name: "Generate" });
    const discuss = screen.getByRole("button", { name: "Discuss" });
    expect(
      generate.compareDocumentPosition(discuss) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(defaultProps.onDiscuss).toHaveBeenCalledOnce();
    expect(defaultProps.onGenerate).toHaveBeenCalledOnce();
    expect(defaultProps.onManual).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText("Chapter Title")).not.toBeInTheDocument();
  });

  it("uses one review editor for manual and generated drafts", () => {
    render(
      <CreateChapterModal
        {...defaultProps}
        view="editor"
        title="Chapter One"
        summary="A finished draft."
      />,
    );

    expect(
      screen.getByRole("textbox", { name: /chapter title/i }),
    ).toHaveValue("Chapter One");
    expect(
      screen.getByRole("textbox", { name: /chapter summary/i }),
    ).toHaveValue(
      "A finished draft.",
    );
    expect(
      screen.getByRole("button", { name: /create chapter/i }),
    ).toBeEnabled();
  });

  it("requires both fields before a chapter can be created", () => {
    render(<CreateChapterModal {...defaultProps} view="editor" />);

    expect(
      screen.getByRole("button", { name: /create chapter/i }),
    ).toBeDisabled();
  });
});
