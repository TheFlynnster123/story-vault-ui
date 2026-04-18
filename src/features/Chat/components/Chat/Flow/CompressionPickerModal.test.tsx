import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../../../../testing";
import { CompressionPickerModal } from "./CompressionPickerModal";

describe("CompressionPickerModal", () => {
  const defaultProps = {
    opened: true,
    onClose: vi.fn(),
    onSelectChapter: vi.fn(),
    onSelectBook: vi.fn(),
  };

  const renderModal = (overrides = {}) =>
    render(<CompressionPickerModal {...defaultProps} {...overrides} />);

  it("should render the modal title", () => {
    renderModal();

    expect(screen.getByText("Compress")).toBeInTheDocument();
  });

  it("should render the explanation text", () => {
    renderModal();

    expect(
      screen.getByText(/reduces the context window/i),
    ).toBeInTheDocument();
  });

  it("should render both compression options", () => {
    renderModal();

    expect(screen.getByText("Compress to Chapter")).toBeInTheDocument();
    expect(screen.getByText("Compress to Book")).toBeInTheDocument();
  });

  it("should render descriptions for each option", () => {
    renderModal();

    expect(
      screen.getByText("Summarize recent messages into a single chapter."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Combine existing chapters into a higher-level book summary.",
      ),
    ).toBeInTheDocument();
  });

  it("should call onSelectChapter and onClose when chapter option is clicked", async () => {
    const { userEvent } = await import("../../../../../testing");
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByText("Compress to Chapter"));

    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onSelectChapter).toHaveBeenCalled();
  });

  it("should call onSelectBook and onClose when book option is clicked", async () => {
    const { userEvent } = await import("../../../../../testing");
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByText("Compress to Book"));

    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onSelectBook).toHaveBeenCalled();
  });

  it("should not render when opened is false", () => {
    renderModal({ opened: false });

    expect(screen.queryByText("Compress to Chapter")).not.toBeInTheDocument();
  });
});
