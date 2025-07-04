import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  LoadingSpinner,
  ChatLoadingSpinner,
} from "../../components/common/LoadingSpinner";

describe("LoadingSpinner", () => {
  it("should render with default message", () => {
    render(<LoadingSpinner />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.getByText("Loading...").parentElement).toHaveClass(
      "loading-spinner-container"
    );
  });

  it("should render with custom message", () => {
    const customMessage = "Please wait...";
    render(<LoadingSpinner message={customMessage} />);

    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it("should render with custom container class", () => {
    const customClass = "custom-container";
    render(<LoadingSpinner containerClassName={customClass} />);

    const container = screen.getByText("Loading...").parentElement;
    expect(container).toHaveClass(customClass);
  });

  it("should not render message when not provided", () => {
    render(<LoadingSpinner message="" />);

    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });
});

describe("ChatLoadingSpinner", () => {
  it("should render chat loading spinner with correct structure", () => {
    render(<ChatLoadingSpinner />);

    expect(screen.getByText("Loading chat...")).toBeInTheDocument();
    const chatContainer = screen
      .getByText("Loading chat...")
      .closest(".chat-container");
    expect(chatContainer).toBeInTheDocument();
  });
});
