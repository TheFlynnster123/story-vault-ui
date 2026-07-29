import { describe, expect, it } from "vitest";
import type { ErrorDiagnostic } from "../services/ErrorDiagnostics";
import { render, screen } from "../testing";
import { DiagnosticSummary } from "./ErrorDiagnosticsModal";

describe("DiagnosticSummary", () => {
  it("shows the upstream provider message in the expanded details", () => {
    const diagnostic: ErrorDiagnostic = {
      id: "diagnostic-1",
      timestamp: new Date("2026-07-29T01:37:50.064Z"),
      message: "Bad request: Provider returned error",
      errorMessage: "Bad request: Provider returned error",
      providerErrorMessage: "messages.8: role 'system' is invalid here",
    };

    render(<DiagnosticSummary diagnostic={diagnostic} />);

    expect(
      screen.getByText("messages.8: role 'system' is invalid here"),
    ).toBeInTheDocument();
  });
});
