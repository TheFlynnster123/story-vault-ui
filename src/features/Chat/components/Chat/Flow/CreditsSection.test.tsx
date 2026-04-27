import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../../../../testing";
import { CreditsSection } from "./CreditsSection";
import { useOpenRouterCredits } from "../../../../OpenRouter/hooks/useOpenRouterCredits";

vi.mock("../../../../OpenRouter/hooks/useOpenRouterCredits");

describe("CreditsSection", () => {
  it("should display loading state", () => {
    vi.mocked(useOpenRouterCredits).mockReturnValue({
      credits: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<CreditsSection chatId="test-chat" />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should display error state", () => {
    vi.mocked(useOpenRouterCredits).mockReturnValue({
      credits: undefined,
      isLoading: false,
      error: new Error("Test error"),
      refetch: vi.fn(),
    });

    render(<CreditsSection chatId="test-chat" />);
    expect(screen.getByText("Error loading balance")).toBeInTheDocument();
  });

  it("should display balance when loaded", () => {
    vi.mocked(useOpenRouterCredits).mockReturnValue({
      credits: {
        balance: 10.5,
        usage: 5.25,
        limit: null,
        isFreeTier: false,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<CreditsSection chatId="test-chat" />);
    expect(screen.getByText("$10.50")).toBeInTheDocument();
  });

  it("should display Credits label", () => {
    vi.mocked(useOpenRouterCredits).mockReturnValue({
      credits: {
        balance: 5.0,
        usage: 2.5,
        limit: null,
        isFreeTier: false,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<CreditsSection chatId="test-chat" />);
    expect(screen.getByText("Credits")).toBeInTheDocument();
  });
});
