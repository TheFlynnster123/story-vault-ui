import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ChatControls } from "../../Chat/ChatControls";
import { useChatSettings } from "../../hooks/useChatSettings";

// Mock the useChatSettings hook
vi.mock("../../hooks/useChatSettings");
const mockUseChatSettings = useChatSettings as vi.MockedFunction<
  typeof useChatSettings
>;

// Mock the ChatSettingsDialog component
vi.mock("../../Chat/ChatSettingsDialog", () => ({
  ChatSettingsDialog: ({ isOpen, onCreate, onCancel, initialValues }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="chat-settings-dialog">
        <div data-testid="initial-values">
          {initialValues ? JSON.stringify(initialValues) : "no-initial-values"}
        </div>
        <button
          onClick={() =>
            onCreate({
              chatTitle: "Test Title",
              context: "Test Context",
              backgroundPhotoBase64: undefined,
            })
          }
        >
          Create
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    );
  },
}));

describe("ChatControls", () => {
  const mockToggleMenu = vi.fn();
  const mockOnSettingsUpdated = vi.fn();
  const mockCreateChatSettings = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChatSettings.mockReturnValue({
      chatSettings: {},
      loadChatSettings: vi.fn(),
      createChatSettings: mockCreateChatSettings,
      updateChatSettings: vi.fn(),
      getChatTitle: vi.fn(),
      isLoading: false,
    });
  });

  const defaultProps = {
    chatId: "test-chat-id",
    toggleMenu: mockToggleMenu,
    onSettingsUpdated: mockOnSettingsUpdated,
    currentChatSettings: null,
  };

  it("renders menu and settings buttons", () => {
    render(<ChatControls {...defaultProps} />);

    expect(screen.getByTitle("Toggle Menu")).toBeInTheDocument();
    expect(screen.getByTitle("Chat Settings")).toBeInTheDocument();
  });

  it("calls toggleMenu when menu button is clicked", () => {
    render(<ChatControls {...defaultProps} />);

    fireEvent.click(screen.getByTitle("Toggle Menu"));
    expect(mockToggleMenu).toHaveBeenCalledTimes(1);
  });

  it("opens settings dialog when settings button is clicked", () => {
    render(<ChatControls {...defaultProps} />);

    fireEvent.click(screen.getByTitle("Chat Settings"));
    expect(screen.getByTestId("chat-settings-dialog")).toBeInTheDocument();
  });

  it("closes settings dialog when cancel is clicked", () => {
    render(<ChatControls {...defaultProps} />);

    // Open dialog
    fireEvent.click(screen.getByTitle("Chat Settings"));
    expect(screen.getByTestId("chat-settings-dialog")).toBeInTheDocument();

    // Close dialog
    fireEvent.click(screen.getByText("Cancel"));
    expect(
      screen.queryByTestId("chat-settings-dialog")
    ).not.toBeInTheDocument();
  });

  it("creates chat settings and calls onSettingsUpdated when form is submitted", async () => {
    mockCreateChatSettings.mockResolvedValue(undefined);
    render(<ChatControls {...defaultProps} />);

    // Open dialog
    fireEvent.click(screen.getByTitle("Chat Settings"));

    // Submit form
    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(mockCreateChatSettings).toHaveBeenCalledWith("test-chat-id", {
        chatTitle: "Test Title",
        context: "Test Context",
        backgroundPhotoBase64: undefined,
      });
    });

    await waitFor(() => {
      expect(mockOnSettingsUpdated).toHaveBeenCalledWith({
        chatTitle: "Test Title",
        context: "Test Context",
        backgroundPhotoBase64: undefined,
      });
    });

    // Dialog should be closed
    expect(
      screen.queryByTestId("chat-settings-dialog")
    ).not.toBeInTheDocument();
  });

  it("handles error when creating chat settings fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockCreateChatSettings.mockRejectedValue(new Error("Failed to create"));

    render(<ChatControls {...defaultProps} />);

    // Open dialog
    fireEvent.click(screen.getByTitle("Chat Settings"));

    // Submit form
    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to update chat settings:",
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("passes existing chat settings as initial values", () => {
    const existingSettings = {
      chatTitle: "Existing Title",
      context: "Existing Context",
      backgroundPhotoBase64: "data:image/png;base64,test",
    };

    const propsWithSettings = {
      ...defaultProps,
      currentChatSettings: existingSettings,
    };

    render(<ChatControls {...propsWithSettings} />);

    // Open dialog
    fireEvent.click(screen.getByTitle("Chat Settings"));

    // Check that initial values are passed
    const initialValuesElement = screen.getByTestId("initial-values");
    expect(initialValuesElement.textContent).toBe(
      JSON.stringify(existingSettings)
    );
  });

  it("has correct button styling classes", () => {
    render(<ChatControls {...defaultProps} />);

    const menuButton = screen.getByTitle("Toggle Menu");
    const settingsButton = screen.getByTitle("Chat Settings");

    expect(menuButton).toHaveClass("chat-controls-button", "menu-button");
    expect(settingsButton).toHaveClass(
      "chat-controls-button",
      "settings-button"
    );
  });
});
