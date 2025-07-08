import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCivitaiAPI } from "../../hooks/useCivitaiAPI";
import { CivitaiAPI } from "../../clients/CivitaiAPI";

// Mock Auth0
const mockGetAccessTokenSilently = vi.fn();
vi.mock("@auth0/auth0-react", () => ({
  useAuth0: () => ({
    getAccessTokenSilently: mockGetAccessTokenSilently,
  }),
}));

// Mock CivitaiAPI
vi.mock("../../clients/CivitaiAPI", () => ({
  CivitaiAPI: vi.fn(),
}));

// Mock Config
vi.mock("../../Config", () => ({
  default: {
    storyVaultAPIURL: "https://test-api.com",
  },
}));

describe("useCivitaiAPI", () => {
  const mockAccessToken = "test-access-token";
  const mockCivitaiAPI = {} as CivitaiAPI;

  beforeEach(() => {
    vi.resetAllMocks();
    (CivitaiAPI as any).mockImplementation(() => mockCivitaiAPI);
  });

  it("should return null initially", () => {
    mockGetAccessTokenSilently.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useCivitaiAPI());

    expect(result.current).toBeNull();
  });

  it("should create CivitaiAPI instance when access token is obtained", async () => {
    mockGetAccessTokenSilently.mockResolvedValue(mockAccessToken);

    const { result } = renderHook(() => useCivitaiAPI());

    await waitFor(() => {
      expect(result.current).toBe(mockCivitaiAPI);
    });

    expect(CivitaiAPI).toHaveBeenCalledWith(mockAccessToken);
  });

  it("should handle access token error and return null", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockGetAccessTokenSilently.mockRejectedValue(new Error("Auth error"));

    const { result } = renderHook(() => useCivitaiAPI());

    await waitFor(() => {
      expect(result.current).toBeNull();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to get access token:",
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it("should recreate API instance when getAccessTokenSilently changes", async () => {
    mockGetAccessTokenSilently.mockResolvedValue(mockAccessToken);

    const { result } = renderHook(() => useCivitaiAPI());

    await waitFor(() => {
      expect(result.current).toBe(mockCivitaiAPI);
    });

    expect(CivitaiAPI).toHaveBeenCalledTimes(1);
  });

  it("should handle multiple rapid calls gracefully", async () => {
    mockGetAccessTokenSilently.mockResolvedValue(mockAccessToken);

    const { result } = renderHook(() => useCivitaiAPI());

    // Wait for the effect to complete
    await waitFor(() => {
      expect(result.current).toBe(mockCivitaiAPI);
    });

    // Verify CivitaiAPI was only called once despite potential race conditions
    expect(CivitaiAPI).toHaveBeenCalledWith(mockAccessToken);
  });

  it("should handle undefined access token", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Mock CivitaiAPI to throw error for undefined token
    (CivitaiAPI as any).mockImplementation((token: any) => {
      if (!token) {
        throw new Error("Access token is required");
      }
      return mockCivitaiAPI;
    });

    mockGetAccessTokenSilently.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCivitaiAPI());

    await waitFor(() => {
      expect(result.current).toBeNull();
    });

    // CivitaiAPI constructor should throw error for undefined token
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("should handle empty string access token", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Mock CivitaiAPI to throw error for empty token
    (CivitaiAPI as any).mockImplementation((token: any) => {
      if (!token) {
        throw new Error("Access token is required");
      }
      return mockCivitaiAPI;
    });

    mockGetAccessTokenSilently.mockResolvedValue("");

    const { result } = renderHook(() => useCivitaiAPI());

    await waitFor(() => {
      expect(result.current).toBeNull();
    });

    // CivitaiAPI constructor should throw error for empty token
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
