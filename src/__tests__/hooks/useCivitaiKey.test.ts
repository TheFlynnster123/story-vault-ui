import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCivitaiKey } from "../../hooks/useCivitaiKey";

// Mock the useCivitaiAPI hook
vi.mock("../../hooks/useCivitaiAPI", () => ({
  useCivitaiAPI: vi.fn(),
}));

import { useCivitaiAPI } from "../../hooks/useCivitaiAPI";

describe("useCivitaiKey", () => {
  const mockHasValidCivitaiKey = vi.fn();
  const mockCivitaiAPI = {
    hasValidCivitaiKey: mockHasValidCivitaiKey,
    saveCivitaiKey: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useCivitaiAPI as any).mockReturnValue(mockCivitaiAPI);
  });

  it("should initialize with undefined key status", () => {
    mockHasValidCivitaiKey.mockResolvedValue(true);

    const { result } = renderHook(() => useCivitaiKey());

    expect(result.current.hasValidCivitaiKey).toBeUndefined();
    expect(typeof result.current.refreshCivitaiKeyStatus).toBe("function");
  });

  it("should check key status on mount when API is available", async () => {
    mockHasValidCivitaiKey.mockResolvedValue(true);

    const { result } = renderHook(() => useCivitaiKey());

    await waitFor(() => {
      expect(result.current.hasValidCivitaiKey).toBe(true);
    });

    expect(mockHasValidCivitaiKey).toHaveBeenCalledTimes(1);
  });

  it("should handle false key status", async () => {
    mockHasValidCivitaiKey.mockResolvedValue(false);

    const { result } = renderHook(() => useCivitaiKey());

    await waitFor(() => {
      expect(result.current.hasValidCivitaiKey).toBe(false);
    });

    expect(mockHasValidCivitaiKey).toHaveBeenCalledTimes(1);
  });

  it("should not check key status when API is not available", async () => {
    (useCivitaiAPI as any).mockReturnValue(null);

    const { result } = renderHook(() => useCivitaiKey());

    // Wait a bit to ensure no async operations occur
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(result.current.hasValidCivitaiKey).toBeUndefined();
    expect(mockHasValidCivitaiKey).not.toHaveBeenCalled();
  });

  it("should refresh key status when refreshCivitaiKeyStatus is called", async () => {
    mockHasValidCivitaiKey
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const { result } = renderHook(() => useCivitaiKey());

    // Wait for initial check
    await waitFor(() => {
      expect(result.current.hasValidCivitaiKey).toBe(false);
    });

    // Call refresh
    await result.current.refreshCivitaiKeyStatus();

    await waitFor(() => {
      expect(result.current.hasValidCivitaiKey).toBe(true);
    });

    expect(mockHasValidCivitaiKey).toHaveBeenCalledTimes(2);
  });

  it("should handle API errors gracefully", async () => {
    mockHasValidCivitaiKey.mockRejectedValue(new Error("API Error"));

    const { result } = renderHook(() => useCivitaiKey());

    // Wait a bit to ensure the async operation completes
    await new Promise((resolve) => setTimeout(resolve, 50));

    // The hook should not crash, but the status should remain undefined
    expect(result.current.hasValidCivitaiKey).toBeUndefined();
    expect(mockHasValidCivitaiKey).toHaveBeenCalledTimes(1);
  });

  it("should re-run effect when civitaiAPI changes", async () => {
    // Start with first API instance
    const firstMockHasValidCivitaiKey = vi.fn();
    const firstMockCivitaiAPI = {
      hasValidCivitaiKey: firstMockHasValidCivitaiKey,
      saveCivitaiKey: vi.fn(),
    };
    firstMockHasValidCivitaiKey.mockResolvedValue(true);
    (useCivitaiAPI as any).mockReturnValue(firstMockCivitaiAPI);

    const { result, rerender } = renderHook(() => useCivitaiKey());

    // Wait for initial effect to complete
    await waitFor(() => {
      expect(result.current.hasValidCivitaiKey).toBe(true);
    });
    expect(firstMockHasValidCivitaiKey).toHaveBeenCalledTimes(1);

    // Change to a new API instance
    const secondMockHasValidCivitaiKey = vi.fn();
    const secondMockCivitaiAPI = {
      hasValidCivitaiKey: secondMockHasValidCivitaiKey,
      saveCivitaiKey: vi.fn(),
    };
    secondMockHasValidCivitaiKey.mockResolvedValue(false);
    (useCivitaiAPI as any).mockReturnValue(secondMockCivitaiAPI);

    // Force re-render to trigger effect with new API
    rerender();

    // The effect should run again with the new API
    await waitFor(() => {
      expect(result.current.hasValidCivitaiKey).toBe(false);
    });
    expect(secondMockHasValidCivitaiKey).toHaveBeenCalledTimes(1);
  });
});
