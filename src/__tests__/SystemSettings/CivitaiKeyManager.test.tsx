import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CivitaiKeyManager } from "../../SystemSettings/CivitaiKeyManager";

// Mock the hooks
vi.mock("../../hooks/useCivitaiKey", () => ({
  useCivitaiKey: vi.fn(),
}));

vi.mock("../../hooks/useCivitaiAPI", () => ({
  useCivitaiAPI: vi.fn(),
}));

vi.mock("../../hooks/useEncryption", () => ({
  useEncryption: vi.fn(),
}));

import { useCivitaiKey } from "../../hooks/useCivitaiKey";
import { useCivitaiAPI } from "../../hooks/useCivitaiAPI";
import { useEncryption } from "../../hooks/useEncryption";

describe("CivitaiKeyManager", () => {
  const mockRefreshCivitaiKeyStatus = vi.fn();
  const mockSaveCivitaiKey = vi.fn();
  const mockEncryptString = vi.fn();

  const mockCivitaiAPI = {
    saveCivitaiKey: mockSaveCivitaiKey,
    hasValidCivitaiKey: vi.fn(),
  };

  const mockEncryptionManager = {
    civitaiEncryptionKey: "mock-encryption-key",
    encryptString: mockEncryptString,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useCivitaiKey as any).mockReturnValue({
      hasValidCivitaiKey: false,
      refreshCivitaiKeyStatus: mockRefreshCivitaiKeyStatus,
    });

    (useCivitaiAPI as any).mockReturnValue(mockCivitaiAPI);

    (useEncryption as any).mockReturnValue({
      encryptionManager: mockEncryptionManager,
    });
  });

  describe("status display", () => {
    it("should show loading state when key status is undefined", () => {
      (useCivitaiKey as any).mockReturnValue({
        hasValidCivitaiKey: undefined,
        refreshCivitaiKeyStatus: mockRefreshCivitaiKeyStatus,
      });

      render(<CivitaiKeyManager />);

      expect(screen.getByText("Checking key status...")).toBeInTheDocument();
      expect(screen.getByText("⟳")).toBeInTheDocument();
    });

    it("should show valid key status", () => {
      (useCivitaiKey as any).mockReturnValue({
        hasValidCivitaiKey: true,
        refreshCivitaiKeyStatus: mockRefreshCivitaiKeyStatus,
      });

      render(<CivitaiKeyManager />);

      expect(
        screen.getByText("Valid Civitai key configured")
      ).toBeInTheDocument();
      expect(screen.getByText("✓")).toBeInTheDocument();
      expect(screen.getByText("Update Key")).toBeInTheDocument();
    });

    it("should show invalid key status", () => {
      render(<CivitaiKeyManager />);

      expect(
        screen.getByText("No valid Civitai key found")
      ).toBeInTheDocument();
      expect(screen.getByText("✗")).toBeInTheDocument();
      expect(screen.getByText("Add Key")).toBeInTheDocument();
    });

    it("should disable update button when status is loading", () => {
      (useCivitaiKey as any).mockReturnValue({
        hasValidCivitaiKey: undefined,
        refreshCivitaiKeyStatus: mockRefreshCivitaiKeyStatus,
      });

      render(<CivitaiKeyManager />);

      const updateButton = screen.getByRole("button");
      expect(updateButton).toBeDisabled();
    });
  });

  describe("key input section", () => {
    it("should show input section when update button is clicked", () => {
      render(<CivitaiKeyManager />);

      const updateButton = screen.getByText("Add Key");
      fireEvent.click(updateButton);

      expect(
        screen.getByText("Enter your Civitai API key:")
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter Civitai API key...")
      ).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.getByText("Save Key")).toBeInTheDocument();
    });

    it("should hide input section when cancel is clicked", () => {
      render(<CivitaiKeyManager />);

      const updateButton = screen.getByText("Add Key");
      fireEvent.click(updateButton);

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(
        screen.queryByText("Enter your Civitai API key:")
      ).not.toBeInTheDocument();
    });

    it("should clear input when cancel is clicked", async () => {
      render(<CivitaiKeyManager />);

      const updateButton = screen.getByText("Add Key");
      fireEvent.click(updateButton);

      const input = screen.getByPlaceholderText("Enter Civitai API key...");
      fireEvent.change(input, { target: { value: "test-key" } });

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      // Get a fresh reference to the button after it's shown again
      const newUpdateButton = screen.getByText("Add Key");
      fireEvent.click(newUpdateButton);

      await waitFor(() => {
        const newInput = screen.getByPlaceholderText(
          "Enter Civitai API key..."
        );
        expect(newInput).toHaveValue("");
      });
    });

    it("should update input value when typing", () => {
      render(<CivitaiKeyManager />);

      const updateButton = screen.getByText("Add Key");
      fireEvent.click(updateButton);

      const input = screen.getByPlaceholderText("Enter Civitai API key...");
      fireEvent.change(input, { target: { value: "test-key" } });

      expect(input).toHaveValue("test-key");
    });
  });

  describe("key saving", () => {
    it("should save key successfully", async () => {
      mockEncryptString.mockResolvedValue("encrypted-key");
      mockSaveCivitaiKey.mockResolvedValue(undefined);

      render(<CivitaiKeyManager />);

      const updateButton = screen.getByText("Add Key");
      fireEvent.click(updateButton);

      const input = screen.getByPlaceholderText("Enter Civitai API key...");
      fireEvent.change(input, { target: { value: "test-key" } });

      const saveButton = screen.getByText("Save Key");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockEncryptString).toHaveBeenCalledWith(
          "mock-encryption-key",
          "test-key"
        );
        expect(mockSaveCivitaiKey).toHaveBeenCalledWith("encrypted-key");
        expect(mockRefreshCivitaiKeyStatus).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(
          screen.getByText("Civitai key updated successfully!")
        ).toBeInTheDocument();
      });
    });

    it("should show error for empty key", async () => {
      render(<CivitaiKeyManager />);

      const updateButton = screen.getByText("Add Key");
      fireEvent.click(updateButton);

      const saveButton = screen.getByText("Save Key");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText("Please enter a valid Civitai key")
        ).toBeInTheDocument();
      });
    });

    it("should show error when encryption manager is not available", async () => {
      (useEncryption as any).mockReturnValue({
        encryptionManager: null,
      });

      render(<CivitaiKeyManager />);

      const updateButton = screen.getByText("Add Key");
      fireEvent.click(updateButton);

      const input = screen.getByPlaceholderText("Enter Civitai API key...");
      fireEvent.change(input, { target: { value: "test-key" } });

      const saveButton = screen.getByText("Save Key");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText("Encryption manager not available")
        ).toBeInTheDocument();
      });
    });

    it("should show error when API is not available", async () => {
      (useCivitaiAPI as any).mockReturnValue(null);

      render(<CivitaiKeyManager />);

      const updateButton = screen.getByText("Add Key");
      fireEvent.click(updateButton);

      const input = screen.getByPlaceholderText("Enter Civitai API key...");
      fireEvent.change(input, { target: { value: "test-key" } });

      const saveButton = screen.getByText("Save Key");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("API not available")).toBeInTheDocument();
      });
    });

    it("should handle save errors", async () => {
      mockEncryptString.mockResolvedValue("encrypted-key");
      mockSaveCivitaiKey.mockRejectedValue(new Error("API Error"));

      // Mock console.error to avoid test output noise
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      render(<CivitaiKeyManager />);

      const updateButton = screen.getByText("Add Key");
      fireEvent.click(updateButton);

      const input = screen.getByPlaceholderText("Enter Civitai API key...");
      fireEvent.change(input, { target: { value: "test-key" } });

      const saveButton = screen.getByText("Save Key");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText("Failed to save Civitai key. Please try again.")
        ).toBeInTheDocument();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to save Civitai key:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it("should enable save button for empty input to show validation error", () => {
      render(<CivitaiKeyManager />);

      const updateButton = screen.getByText("Add Key");
      fireEvent.click(updateButton);

      const saveButton = screen.getByText("Save Key");
      expect(saveButton).not.toBeDisabled();
    });

    it("should enable save button when input has value", () => {
      render(<CivitaiKeyManager />);

      const updateButton = screen.getByText("Add Key");
      fireEvent.click(updateButton);

      const input = screen.getByPlaceholderText("Enter Civitai API key...");
      fireEvent.change(input, { target: { value: "test-key" } });

      const saveButton = screen.getByText("Save Key");
      expect(saveButton).not.toBeDisabled();
    });

    it("should show loading state during save", async () => {
      mockEncryptString.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve("encrypted-key"), 100)
          )
      );
      mockSaveCivitaiKey.mockResolvedValue(undefined);

      render(<CivitaiKeyManager />);

      const updateButton = screen.getByText("Add Key");
      fireEvent.click(updateButton);

      const input = screen.getByPlaceholderText("Enter Civitai API key...");
      fireEvent.change(input, { target: { value: "test-key" } });

      const saveButton = screen.getByText("Save Key");
      fireEvent.click(saveButton);

      expect(screen.getByText("Saving...")).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
      expect(input).toBeDisabled();

      await waitFor(() => {
        expect(
          screen.getByText("Civitai key updated successfully!")
        ).toBeInTheDocument();
      });
    });

    it("should hide input section after successful save", async () => {
      mockEncryptString.mockResolvedValue("encrypted-key");
      mockSaveCivitaiKey.mockResolvedValue(undefined);

      render(<CivitaiKeyManager />);

      const updateButton = screen.getByText("Add Key");
      fireEvent.click(updateButton);

      const input = screen.getByPlaceholderText("Enter Civitai API key...");
      fireEvent.change(input, { target: { value: "test-key" } });

      const saveButton = screen.getByText("Save Key");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(
          screen.queryByText("Enter your Civitai API key:")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("should have proper labels for form elements", () => {
      render(<CivitaiKeyManager />);

      const updateButton = screen.getByText("Add Key");
      fireEvent.click(updateButton);

      const input = screen.getByLabelText("Enter your Civitai API key:");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("id", "civitai-key-input");
    });

    it("should have proper button roles", () => {
      render(<CivitaiKeyManager />);

      const updateButton = screen.getByRole("button", { name: "Add Key" });
      expect(updateButton).toBeInTheDocument();

      fireEvent.click(updateButton);

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      const saveButton = screen.getByRole("button", { name: "Save Key" });

      expect(cancelButton).toBeInTheDocument();
      expect(saveButton).toBeInTheDocument();
    });
  });

  describe("CSS classes", () => {
    it("should apply correct CSS classes", () => {
      render(<CivitaiKeyManager />);

      const container = screen
        .getByText("No valid Civitai key found")
        .closest(".civitai-key-manager");
      expect(container).toBeInTheDocument();

      const statusDisplay = screen
        .getByText("No valid Civitai key found")
        .closest(".civitai-status-display");
      expect(statusDisplay).toBeInTheDocument();
    });

    it("should apply correct status classes", () => {
      render(<CivitaiKeyManager />);

      const invalidIcon = screen.getByText("✗");
      expect(invalidIcon).toHaveClass("civitai-status-invalid");

      const statusText = screen.getByText("No valid Civitai key found");
      expect(statusText).toHaveClass("civitai-status-text");
    });
  });
});
