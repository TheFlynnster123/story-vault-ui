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
        limitRemaining: 12.66,
        usage: 5.25,
        usageDaily: 1.23,
        usageWeekly: 7.34,
        usageMonthly: 44.39,
        limit: 20,
        limitReset: "weekly",
        isFreeTier: false,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<CreditsSection chatId="test-chat" />);
    expect(screen.getByText("Spend Today:")).toBeInTheDocument();
    expect(screen.getByText("$1.23")).toBeInTheDocument();
    expect(screen.getByText("Limit:")).toBeInTheDocument();
    expect(screen.getByText("$12.66")).toBeInTheDocument();
    expect(screen.getByText("Resets:")).toBeInTheDocument();
    expect(screen.getByText("weekly")).toBeInTheDocument();
    expect(screen.getByText("Spent this Week:")).toBeInTheDocument();
    expect(screen.getByText("$7.34")).toBeInTheDocument();
    expect(screen.getByText("Month:")).toBeInTheDocument();
    expect(screen.getByText("$44.39")).toBeInTheDocument();
  });

  it("should display Credits label", () => {
    vi.mocked(useOpenRouterCredits).mockReturnValue({
      credits: {
        limitRemaining: 5.0,
        usage: 2.5,
        usageDaily: 0.5,
        usageWeekly: 1.5,
        usageMonthly: 2.5,
        limit: null,
        limitReset: null,
        isFreeTier: false,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<CreditsSection chatId="test-chat" />);
    expect(screen.getByText("Credits")).toBeInTheDocument();
  });

  it("should show unlimited and never when the key has no limit reset", () => {
    vi.mocked(useOpenRouterCredits).mockReturnValue({
      credits: {
        limitRemaining: 5.0,
        usage: 2.5,
        usageDaily: 0.75,
        usageWeekly: 2.5,
        usageMonthly: 4.25,
        limit: null,
        limitReset: null,
        isFreeTier: false,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<CreditsSection chatId="test-chat" />);
    expect(screen.getByText("$0.75")).toBeInTheDocument();
    expect(screen.getByText("$5.00")).toBeInTheDocument();
    expect(screen.getByText("never")).toBeInTheDocument();
    expect(screen.getByText("$2.50")).toBeInTheDocument();
    expect(screen.getByText("$4.25")).toBeInTheDocument();
  });
});
