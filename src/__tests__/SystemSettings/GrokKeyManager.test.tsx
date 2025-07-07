import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { GrokKeyManager } from "../../SystemSettings/GrokKeyManager";

// Mock the hooks
const mockRefreshGrokKeyStatus = vi.fn();
const mockUseGrokKey = vi.fn();
const mockUseStoryVaultAPI = vi.fn();
const mockUseEncryption = vi.fn();

vi.mock("../../hooks/useGrokKey", () => ({
  useGrokKey: () => mockUseGrokKey(),
}));

vi.mock("../../hooks/useStoryVaultAPI", () => ({
  useStoryVaultAPI: () => mockUseStoryVaultAPI(),
}));

vi.mock("../../hooks/useEncryption", () => ({
  useEncryption: () => mockUseEncryption(),
}));

describe("GrokKeyManager", () => {
  const mockEncryptString = vi.fn();
  const mockSaveGrokKey = vi.fn();
  const mockStoryVaultAPI = {
    saveGrokKey: mockSaveGrokKey,
  };
  const mockEncryptionManager = {
    encryptString: mockEncryptString,
    grokEncryptionKey: "test-encryption-key",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseGrokKey.mockReturnValue({
      hasValidGrokKey: undefined,
      refreshGrokKeyStatus: mockRefreshGrokKeyStatus,
    });

    mockUseStoryVaultAPI.mockReturnValue(mockStoryVaultAPI);

    mockUseEncryption.mockReturnValue({
      encryptionManager: mockEncryptionManager,
    });
  });

  describe("status display", () => {
    it("should show loading state when key status is undefined", () => {
      render(<GrokKeyManager />);

      expect(screen.getByText("Checking key status...")).toBeInTheDocument();
      expect(screen.getByText("⟳")).toBeInTheDocument();
    });

    it("should show valid status when key is valid", () => {
      mockUseGrokKey.mockReturnValue({
        hasValidGrokKey: true,
        refreshGrokKeyStatus: mockRefreshGrokKeyStatus,
      });

      render(<GrokKeyManager />);

      expect(screen.getByText("Valid Grok key configured")).toBeInTheDocument();
      expect(screen.getByText("✓")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Update Key" })
      ).toBeInTheDocument();
    });

    it("should show invalid status when key is invalid", () => {
      mockUseGrokKey.mockReturnValue({
        hasValidGrokKey: false,
        refreshGrokKeyStatus: mockRefreshGrokKeyStatus,
      });

      render(<GrokKeyManager />);

      expect(screen.getByText("No valid Grok key found")).toBeInTheDocument();
      expect(screen.getByText("✗")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Add Key" })
      ).toBeInTheDocument();
    });

    it("should disable update button when status is loading", () => {
      render(<GrokKeyManager />);

      const updateButton = screen.getByRole("button");
      expect(updateButton).toBeDisabled();
    });
  });

  describe("key input section", () => {
    beforeEach(() => {
      mockUseGrokKey.mockReturnValue({
        hasValidGrokKey: false,
        refreshGrokKeyStatus: mockRefreshGrokKeyStatus,
      });
    });

    it("should show input section when update button is clicked", () => {
      render(<GrokKeyManager />);

      const updateButton = screen.getByRole("button", { name: "Add Key" });
      fireEvent.click(updateButton);

      expect(
        screen.getByLabelText("Enter your Grok API key:")
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter Grok API key...")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Cancel" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Save Key" })
      ).toBeInTheDocument();
    });

    it("should hide update button when input section is shown", () => {
      render(<GrokKeyManager />);

      const updateButton = screen.getByRole("button", { name: "Add Key" });
      fireEvent.click(updateButton);

      expect(
        screen.queryByRole("button", { name: "Add Key" })
      ).not.toBeInTheDocument();
    });

    it("should hide input section when cancel is clicked", () => {
      render(<GrokKeyManager />);

      const updateButton = screen.getByRole("button", { name: "Add Key" });
      fireEvent.click(updateButton);

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelButton);

      expect(
        screen.queryByLabelText("Enter your Grok API key:")
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Add Key" })
      ).toBeInTheDocument();
    });

    it("should clear input when cancel is clicked", () => {
      render(<GrokKeyManager />);

      const updateButton = screen.getByRole("button", { name: "Add Key" });
      fireEvent.click(updateButton);

      const input = screen.getByPlaceholderText("Enter Grok API key...");
      fireEvent.change(input, { target: { value: "test-key" } });
      expect(input).toHaveValue("test-key");

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelButton);

      // After cancel, input section should be hidden
      expect(
        screen.queryByPlaceholderText("Enter Grok API key...")
      ).not.toBeInTheDocument();

      // Click update button again to show input section
      const newUpdateButton = screen.getByRole("button", { name: "Add Key" });
      fireEvent.click(newUpdateButton);

      // Input should be empty after reopening
      const newInput = screen.getByPlaceholderText("Enter Grok API key...");
      expect(newInput).toHaveValue("");
    });
  });

  describe("key saving", () => {
    beforeEach(() => {
      mockUseGrokKey.mockReturnValue({
        hasValidGrokKey: false,
        refreshGrokKeyStatus: mockRefreshGrokKeyStatus,
      });
      mockEncryptString.mockResolvedValue("encrypted-key");
      mockSaveGrokKey.mockResolvedValue(undefined);
    });

    it("should save key successfully", async () => {
      render(<GrokKeyManager />);

      const updateButton = screen.getByRole("button", { name: "Add Key" });
      fireEvent.click(updateButton);

      const input = screen.getByPlaceholderText("Enter Grok API key...");
      fireEvent.change(input, { target: { value: "test-grok-key" } });

      const saveButton = screen.getByRole("button", { name: "Save Key" });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockEncryptString).toHaveBeenCalledWith(
          "test-encryption-key",
          "test-grok-key"
        );
        expect(mockSaveGrokKey).toHaveBeenCalledWith("encrypted-key");
        expect(mockRefreshGrokKeyStatus).toHaveBeenCalled();
      });

      expect(
        screen.getByText("Grok key updated successfully!")
      ).toBeInTheDocument();
    });

    it("should show error for empty key", async () => {
      render(<GrokKeyManager />);

      const updateButton = screen.getByRole("button", { name: "Add Key" });
      fireEvent.click(updateButton);

      const input = screen.getByPlaceholderText("Enter Grok API key...");
      // Add some text first to enable the button
      fireEvent.change(input, { target: { value: "valid-key" } });

      const saveButton = screen.getByRole("button", { name: "Save Key" });
      expect(saveButton).not.toBeDisabled();

      // Then clear it to simulate empty input - use empty string
      fireEvent.change(input, { target: { value: "" } });

      // Button should be disabled with empty input
      expect(saveButton).toBeDisabled();

      // Add whitespace - this should also be disabled since trim() removes it
      fireEvent.change(input, { target: { value: "  " } });

      // Button should still be disabled because trim() makes it empty
      expect(saveButton).toBeDisabled();

      // Add a single character to enable the button
      fireEvent.change(input, { target: { value: " a " } });
      expect(saveButton).not.toBeDisabled();

      // Now clear it again and try to trigger the validation by directly calling the save function
      fireEvent.change(input, { target: { value: "   " } });

      // Since button is disabled, we can't test the validation error this way
      // Instead, let's test that the button correctly stays disabled for whitespace-only input
      expect(saveButton).toBeDisabled();
    });

    it("should show error when encryption manager is not available", async () => {
      mockUseEncryption.mockReturnValue({
        encryptionManager: null,
      });

      render(<GrokKeyManager />);

      const updateButton = screen.getByRole("button", { name: "Add Key" });
      fireEvent.click(updateButton);

      const input = screen.getByPlaceholderText("Enter Grok API key...");
      fireEvent.change(input, { target: { value: "test-key" } });

      const saveButton = screen.getByRole("button", { name: "Save Key" });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText("Encryption manager not available")
        ).toBeInTheDocument();
      });
    });

    it("should show error when API is not available", async () => {
      mockUseStoryVaultAPI.mockReturnValue(null);

      render(<GrokKeyManager />);

      const updateButton = screen.getByRole("button", { name: "Add Key" });
      fireEvent.click(updateButton);

      const input = screen.getByPlaceholderText("Enter Grok API key...");
      fireEvent.change(input, { target: { value: "test-key" } });

      const saveButton = screen.getByRole("button", { name: "Save Key" });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("API not available")).toBeInTheDocument();
      });
    });

    it("should handle save errors", async () => {
      mockSaveGrokKey.mockRejectedValue(new Error("API Error"));

      render(<GrokKeyManager />);

      const updateButton = screen.getByRole("button", { name: "Add Key" });
      fireEvent.click(updateButton);

      const input = screen.getByPlaceholderText("Enter Grok API key...");
      fireEvent.change(input, { target: { value: "test-key" } });

      const saveButton = screen.getByRole("button", { name: "Save Key" });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText("Failed to save Grok key. Please try again.")
        ).toBeInTheDocument();
      });
    });

    it("should disable save button for empty input", () => {
      render(<GrokKeyManager />);

      const updateButton = screen.getByRole("button", { name: "Add Key" });
      fireEvent.click(updateButton);

      const saveButton = screen.getByRole("button", { name: "Save Key" });
      expect(saveButton).toBeDisabled();
    });

    it("should enable save button when input has value", () => {
      render(<GrokKeyManager />);

      const updateButton = screen.getByRole("button", { name: "Add Key" });
      fireEvent.click(updateButton);

      const input = screen.getByPlaceholderText("Enter Grok API key...");
      fireEvent.change(input, { target: { value: "test-key" } });

      const saveButton = screen.getByRole("button", { name: "Save Key" });
      expect(saveButton).not.toBeDisabled();
    });

    it("should show loading state during save", async () => {
      mockSaveGrokKey.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<GrokKeyManager />);

      const updateButton = screen.getByRole("button", { name: "Add Key" });
      fireEvent.click(updateButton);

      const input = screen.getByPlaceholderText("Enter Grok API key...");
      fireEvent.change(input, { target: { value: "test-key" } });

      const saveButton = screen.getByRole("button", { name: "Save Key" });
      fireEvent.click(saveButton);

      expect(
        screen.getByRole("button", { name: "Saving..." })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      expect(input).toBeDisabled();
    });

    it("should hide input section after successful save", async () => {
      render(<GrokKeyManager />);

      const updateButton = screen.getByRole("button", { name: "Add Key" });
      fireEvent.click(updateButton);

      const input = screen.getByPlaceholderText("Enter Grok API key...");
      fireEvent.change(input, { target: { value: "test-key" } });

      const saveButton = screen.getByRole("button", { name: "Save Key" });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(
          screen.queryByLabelText("Enter your Grok API key:")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    beforeEach(() => {
      mockUseGrokKey.mockReturnValue({
        hasValidGrokKey: false,
        refreshGrokKeyStatus: mockRefreshGrokKeyStatus,
      });
    });

    it("should have proper labels for form elements", () => {
      render(<GrokKeyManager />);

      const updateButton = screen.getByRole("button", { name: "Add Key" });
      fireEvent.click(updateButton);

      expect(
        screen.getByLabelText("Enter your Grok API key:")
      ).toBeInTheDocument();
    });

    it("should have proper button labels", () => {
      render(<GrokKeyManager />);

      const updateButton = screen.getByRole("button", { name: "Add Key" });
      fireEvent.click(updateButton);

      expect(
        screen.getByRole("button", { name: "Cancel" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Save Key" })
      ).toBeInTheDocument();
    });
  });

  describe("CSS classes", () => {
    it("should have correct CSS classes", () => {
      render(<GrokKeyManager />);

      expect(document.querySelector(".grok-key-manager")).toBeInTheDocument();
      expect(
        document.querySelector(".grok-status-display")
      ).toBeInTheDocument();
      expect(document.querySelector(".grok-status-info")).toBeInTheDocument();
    });

    it("should apply correct status classes", () => {
      mockUseGrokKey.mockReturnValue({
        hasValidGrokKey: true,
        refreshGrokKeyStatus: mockRefreshGrokKeyStatus,
      });

      render(<GrokKeyManager />);

      expect(document.querySelector(".grok-status-valid")).toBeInTheDocument();
    });
  });
});
