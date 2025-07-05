import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { ChatSettingsDialog } from "../../Chat/ChatSettingsDialog";
import type { ChatSettings } from "../../models/ChatSettingsNote";

describe("ChatSettingsDialog", () => {
  const mockOnCancel = vi.fn();
  const mockOnCreate = vi.fn();

  const defaultProps = {
    isOpen: true,
    onCancel: mockOnCancel,
    onCreate: mockOnCreate,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should not render when isOpen is false", () => {
      render(<ChatSettingsDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Create New Chat")).not.toBeInTheDocument();
    });

    it("should render dialog when isOpen is true", () => {
      render(<ChatSettingsDialog {...defaultProps} />);
      expect(screen.getByText("Create New Chat")).toBeInTheDocument();
      expect(screen.getByLabelText("Story Title *")).toBeInTheDocument();
      expect(screen.getByLabelText("First Message *")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Cancel" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Create Chat" })
      ).toBeInTheDocument();
    });

    it("should have proper placeholders", () => {
      render(<ChatSettingsDialog {...defaultProps} />);
      expect(
        screen.getByPlaceholderText("Enter a title for your story...")
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(
          "Enter the first message to start your story..."
        )
      ).toBeInTheDocument();
    });

    it("should focus on story title input when opened", () => {
      render(<ChatSettingsDialog {...defaultProps} />);
      const titleInput = screen.getByLabelText("Story Title *");
      expect(titleInput).toHaveFocus();
    });
  });

  describe("form validation", () => {
    it("should show error when story title is empty", async () => {
      render(<ChatSettingsDialog {...defaultProps} />);

      const createButton = screen.getByRole("button", { name: "Create Chat" });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText("Story title is required")).toBeInTheDocument();
      });
      expect(mockOnCreate).not.toHaveBeenCalled();
    });

    it("should show error when context is empty", async () => {
      render(<ChatSettingsDialog {...defaultProps} />);

      const titleInput = screen.getByLabelText("Story Title *");
      fireEvent.change(titleInput, { target: { value: "Test Title" } });

      const createButton = screen.getByRole("button", { name: "Create Chat" });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(
          screen.getByText("First message is required")
        ).toBeInTheDocument();
      });
      expect(mockOnCreate).not.toHaveBeenCalled();
    });

    it("should show both errors when both fields are empty", async () => {
      render(<ChatSettingsDialog {...defaultProps} />);

      const createButton = screen.getByRole("button", { name: "Create Chat" });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText("Story title is required")).toBeInTheDocument();
        expect(
          screen.getByText("First message is required")
        ).toBeInTheDocument();
      });
      expect(mockOnCreate).not.toHaveBeenCalled();
    });

    it("should add error class to inputs with errors", async () => {
      render(<ChatSettingsDialog {...defaultProps} />);

      const createButton = screen.getByRole("button", { name: "Create Chat" });
      fireEvent.click(createButton);

      await waitFor(() => {
        const titleInput = screen.getByLabelText("Story Title *");
        const contextInput = screen.getByLabelText("First Message *");
        expect(titleInput).toHaveClass("error");
        expect(contextInput).toHaveClass("error");
      });
    });
  });

  describe("form submission", () => {
    it("should call onCreate with correct data when form is valid", async () => {
      render(<ChatSettingsDialog {...defaultProps} />);

      const titleInput = screen.getByLabelText("Story Title *");
      const contextInput = screen.getByLabelText("First Message *");

      fireEvent.change(titleInput, { target: { value: "My Epic Story" } });
      fireEvent.change(contextInput, {
        target: { value: "A fantasy adventure in a magical realm" },
      });

      const createButton = screen.getByRole("button", { name: "Create Chat" });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith({
          chatTitle: "My Epic Story",
          context: "A fantasy adventure in a magical realm",
        });
      });
    });

    it("should trim whitespace from inputs", async () => {
      render(<ChatSettingsDialog {...defaultProps} />);

      const titleInput = screen.getByLabelText("Story Title *");
      const contextInput = screen.getByLabelText("First Message *");

      fireEvent.change(titleInput, { target: { value: "  My Story  " } });
      fireEvent.change(contextInput, { target: { value: "  My Context  " } });

      const createButton = screen.getByRole("button", { name: "Create Chat" });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith({
          chatTitle: "My Story",
          context: "My Context",
        });
      });
    });

    it("should reset form after successful submission", async () => {
      render(<ChatSettingsDialog {...defaultProps} />);

      const titleInput = screen.getByLabelText(
        "Story Title *"
      ) as HTMLInputElement;
      const contextInput = screen.getByLabelText(
        "First Message *"
      ) as HTMLTextAreaElement;

      fireEvent.change(titleInput, { target: { value: "Test Title" } });
      fireEvent.change(contextInput, { target: { value: "Test Context" } });

      const createButton = screen.getByRole("button", { name: "Create Chat" });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalled();
      });

      // Form should be reset
      expect(titleInput.value).toBe("");
      expect(contextInput.value).toBe("");
    });
  });

  describe("cancellation", () => {
    it("should call onCancel when cancel button is clicked", () => {
      render(<ChatSettingsDialog {...defaultProps} />);

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it("should call onCancel when close button is clicked", () => {
      render(<ChatSettingsDialog {...defaultProps} />);

      const closeButton = screen.getByRole("button", { name: "×" });
      fireEvent.click(closeButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it("should reset form when cancelled", () => {
      render(<ChatSettingsDialog {...defaultProps} />);

      const titleInput = screen.getByLabelText(
        "Story Title *"
      ) as HTMLInputElement;
      const contextInput = screen.getByLabelText(
        "First Message *"
      ) as HTMLTextAreaElement;

      // Fill form
      fireEvent.change(titleInput, { target: { value: "Test Title" } });
      fireEvent.change(contextInput, { target: { value: "Test Context" } });

      // Cancel
      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();

      // Form should be reset
      expect(titleInput.value).toBe("");
      expect(contextInput.value).toBe("");
    });

    it("should handle escape key", () => {
      render(<ChatSettingsDialog {...defaultProps} />);

      const overlay = document.querySelector(".chat-settings-overlay");
      fireEvent.keyDown(overlay!, { key: "Escape" });

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe("error clearing", () => {
    it("should clear errors when form becomes valid", async () => {
      render(<ChatSettingsDialog {...defaultProps} />);

      // Trigger validation errors
      const createButton = screen.getByRole("button", { name: "Create Chat" });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText("Story title is required")).toBeInTheDocument();
        expect(
          screen.getByText("First message is required")
        ).toBeInTheDocument();
      });

      // Fill in the form
      const titleInput = screen.getByLabelText("Story Title *");
      const contextInput = screen.getByLabelText("First Message *");

      fireEvent.change(titleInput, { target: { value: "Valid Title" } });
      fireEvent.change(contextInput, { target: { value: "Valid Context" } });

      // Try to submit again
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalledWith({
          chatTitle: "Valid Title",
          context: "Valid Context",
        });
      });

      // Errors should be cleared
      expect(
        screen.queryByText("Story title is required")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("First message is required")
      ).not.toBeInTheDocument();
    });
  });
});
