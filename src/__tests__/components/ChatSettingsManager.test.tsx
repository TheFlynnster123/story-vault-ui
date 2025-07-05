import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { ChatSettingsManager } from "../../Chat/ChatSettingsManager";
import { useChatSettings } from "../../hooks/useChatSettings";

// Mock the useChatSettings hook
vi.mock("../../hooks/useChatSettings");

// Mock the ChatSettingsDialog component
vi.mock("../../Chat/ChatSettingsDialog", () => ({
  ChatSettingsDialog: ({ isOpen, onCancel, onCreate }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="chat-settings-dialog">
        <button onClick={onCancel}>Cancel</button>
        <button
          onClick={() =>
            onCreate({ chatTitle: "Test Story", context: "Test context" })
          }
        >
          Create
        </button>
      </div>
    );
  },
}));

describe("ChatSettingsManager", () => {
  const mockOnChatCreated = vi.fn();
  const mockGenerateChatId = vi.fn();
  const mockCreateChatSettings = vi.fn();

  const defaultProps = {
    onChatCreated: mockOnChatCreated,
    generateChatId: mockGenerateChatId,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateChatId.mockReturnValue("new-chat-id");
    (useChatSettings as any).mockReturnValue({
      createChatSettings: mockCreateChatSettings,
    });
  });

  describe("rendering", () => {
    it("should render create chat button", () => {
      render(<ChatSettingsManager {...defaultProps} />);
      expect(screen.getByText("Create New Chat")).toBeInTheDocument();
    });

    it("should not show dialog initially", () => {
      render(<ChatSettingsManager {...defaultProps} />);
      expect(
        screen.queryByTestId("chat-settings-dialog")
      ).not.toBeInTheDocument();
    });
  });

  describe("dialog interaction", () => {
    it("should show dialog when create button is clicked", () => {
      render(<ChatSettingsManager {...defaultProps} />);

      const createButton = screen.getByText("Create New Chat");
      fireEvent.click(createButton);

      expect(screen.getByTestId("chat-settings-dialog")).toBeInTheDocument();
    });

    it("should hide dialog when cancelled", () => {
      render(<ChatSettingsManager {...defaultProps} />);

      // Open dialog
      const createButton = screen.getByText("Create New Chat");
      fireEvent.click(createButton);

      // Cancel dialog
      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(
        screen.queryByTestId("chat-settings-dialog")
      ).not.toBeInTheDocument();
    });
  });

  describe("chat creation", () => {
    it("should create chat with settings when dialog is submitted", async () => {
      render(<ChatSettingsManager {...defaultProps} />);

      // Open dialog
      const createButton = screen.getByText("Create New Chat");
      fireEvent.click(createButton);

      // Submit dialog
      const submitButton = screen.getByText("Create");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockGenerateChatId).toHaveBeenCalled();
        expect(mockCreateChatSettings).toHaveBeenCalledWith("new-chat-id", {
          chatTitle: "Test Story",
          context: "Test context",
        });
        expect(mockOnChatCreated).toHaveBeenCalledWith("new-chat-id");
      });

      // Dialog should be closed
      expect(
        screen.queryByTestId("chat-settings-dialog")
      ).not.toBeInTheDocument();
    });

    it("should handle creation errors gracefully", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockCreateChatSettings.mockRejectedValue(new Error("Creation failed"));

      render(<ChatSettingsManager {...defaultProps} />);

      // Open dialog
      const createButton = screen.getByText("Create New Chat");
      fireEvent.click(createButton);

      // Submit dialog
      const submitButton = screen.getByText("Create");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to create chat with settings:",
          expect.any(Error)
        );
      });

      // Dialog should remain open on error
      expect(screen.getByTestId("chat-settings-dialog")).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    it("should generate unique chat IDs", async () => {
      // Reset mocks to ensure clean state
      vi.clearAllMocks();
      mockCreateChatSettings.mockResolvedValue(undefined);
      mockGenerateChatId
        .mockReturnValueOnce("chat-1")
        .mockReturnValueOnce("chat-2");
      (useChatSettings as any).mockReturnValue({
        createChatSettings: mockCreateChatSettings,
      });

      render(<ChatSettingsManager {...defaultProps} />);

      // Create first chat
      fireEvent.click(screen.getByText("Create New Chat"));
      fireEvent.click(screen.getByText("Create"));

      await waitFor(() => {
        expect(mockOnChatCreated).toHaveBeenCalledWith("chat-1");
      });

      // Reset for second chat creation
      vi.clearAllMocks();
      mockCreateChatSettings.mockResolvedValue(undefined);
      mockGenerateChatId.mockReturnValueOnce("chat-2");
      (useChatSettings as any).mockReturnValue({
        createChatSettings: mockCreateChatSettings,
      });

      // Create second chat
      fireEvent.click(screen.getByText("Create New Chat"));
      fireEvent.click(screen.getByText("Create"));

      await waitFor(() => {
        expect(mockOnChatCreated).toHaveBeenCalledWith("chat-2");
      });
    });
  });

  describe("CSS classes", () => {
    it("should apply correct CSS class to create button", () => {
      render(<ChatSettingsManager {...defaultProps} />);
      const createButton = screen.getByText("Create New Chat");
      expect(createButton).toHaveClass("chat-menu-create-item");
    });
  });
});
