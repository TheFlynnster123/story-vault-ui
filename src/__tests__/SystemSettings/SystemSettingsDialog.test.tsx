import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { SystemSettingsDialog } from "../../SystemSettings/SystemSettingsDialog";

// Mock the GrokKeyManager component
vi.mock("../../SystemSettings/GrokKeyManager", () => ({
  GrokKeyManager: () => (
    <div data-testid="grok-key-manager">GrokKeyManager</div>
  ),
}));

describe("SystemSettingsDialog", () => {
  const mockOnClose = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset body overflow style
    document.body.style.overflow = "unset";
  });

  describe("rendering", () => {
    it("should not render when isOpen is false", () => {
      render(<SystemSettingsDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("System Settings")).not.toBeInTheDocument();
    });

    it("should render dialog when isOpen is true", () => {
      render(<SystemSettingsDialog {...defaultProps} />);
      expect(screen.getByText("System Settings")).toBeInTheDocument();
      expect(screen.getByText("Grok API Configuration")).toBeInTheDocument();
      expect(screen.getByTestId("grok-key-manager")).toBeInTheDocument();
    });

    it("should render close button", () => {
      render(<SystemSettingsDialog {...defaultProps} />);
      const closeButton = screen.getByRole("button", {
        name: "Close system settings",
      });
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveTextContent("×");
    });

    it("should have proper ARIA labels", () => {
      render(<SystemSettingsDialog {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Close system settings" })
      ).toBeInTheDocument();
    });
  });

  describe("body scroll management", () => {
    it("should prevent body scroll when dialog is open", () => {
      render(<SystemSettingsDialog {...defaultProps} />);
      expect(document.body.style.overflow).toBe("hidden");
    });

    it("should restore body scroll when dialog is closed", () => {
      const { rerender } = render(<SystemSettingsDialog {...defaultProps} />);
      expect(document.body.style.overflow).toBe("hidden");

      rerender(<SystemSettingsDialog {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe("unset");
    });

    it("should restore body scroll on unmount", () => {
      const { unmount } = render(<SystemSettingsDialog {...defaultProps} />);
      expect(document.body.style.overflow).toBe("hidden");

      unmount();
      expect(document.body.style.overflow).toBe("unset");
    });
  });

  describe("closing behavior", () => {
    it("should call onClose when close button is clicked", () => {
      render(<SystemSettingsDialog {...defaultProps} />);
      const closeButton = screen.getByRole("button", {
        name: "Close system settings",
      });
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when overlay is clicked", () => {
      render(<SystemSettingsDialog {...defaultProps} />);
      const overlay = document.querySelector(".system-settings-overlay");
      fireEvent.click(overlay!);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should not call onClose when dialog content is clicked", () => {
      render(<SystemSettingsDialog {...defaultProps} />);
      const dialog = document.querySelector(".system-settings-dialog");
      fireEvent.click(dialog!);
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("should call onClose when Escape key is pressed", () => {
      render(<SystemSettingsDialog {...defaultProps} />);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should not call onClose when other keys are pressed", () => {
      render(<SystemSettingsDialog {...defaultProps} />);
      fireEvent.keyDown(document, { key: "Enter" });
      fireEvent.keyDown(document, { key: "Space" });
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe("keyboard event handling", () => {
    it("should add keyboard event listener when dialog opens", () => {
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");
      render(<SystemSettingsDialog {...defaultProps} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function)
      );
    });

    it("should remove keyboard event listener when dialog closes", () => {
      const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
      const { rerender } = render(<SystemSettingsDialog {...defaultProps} />);

      rerender(<SystemSettingsDialog {...defaultProps} isOpen={false} />);

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function)
      );
    });

    it("should not add keyboard event listener when dialog is closed", () => {
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");
      render(<SystemSettingsDialog {...defaultProps} isOpen={false} />);

      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        "keydown",
        expect.any(Function)
      );
    });
  });

  describe("dialog structure", () => {
    it("should have correct CSS classes", () => {
      render(<SystemSettingsDialog {...defaultProps} />);

      expect(
        document.querySelector(".system-settings-overlay")
      ).toBeInTheDocument();
      expect(
        document.querySelector(".system-settings-dialog")
      ).toBeInTheDocument();
      expect(
        document.querySelector(".system-settings-header")
      ).toBeInTheDocument();
      expect(
        document.querySelector(".system-settings-content")
      ).toBeInTheDocument();
      expect(
        document.querySelector(".system-settings-section")
      ).toBeInTheDocument();
    });

    it("should have proper heading hierarchy", () => {
      render(<SystemSettingsDialog {...defaultProps} />);

      const mainHeading = screen.getByRole("heading", { level: 2 });
      expect(mainHeading).toHaveTextContent("System Settings");

      const sectionHeading = screen.getByRole("heading", { level: 3 });
      expect(sectionHeading).toHaveTextContent("Grok API Configuration");
    });
  });
});
