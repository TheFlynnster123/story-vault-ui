import { notifications } from "@mantine/notifications";
import { createElement } from "react";
import { OpenRouterError } from "../features/OpenRouter/services/OpenRouterError";
import { getErrorDiagnosticsInstance } from "./ErrorDiagnostics";

export interface IErrorService {
  log: (message: string, error?: unknown) => void;
}

export class ErrorService implements IErrorService {
  log = (message: string, error?: unknown) => {
    console.error(message, error);
    const diagnostic = getErrorDiagnosticsInstance().record(message, error);

    if (error instanceof OpenRouterError) {
      this.showOpenRouterError(error, diagnostic.id);
      return;
    }

    notifications.show({
      message: buildNotificationMessage(message, diagnostic.id),
      color: "red",
      autoClose: 10_000,
      withCloseButton: true,
    });
  };

  private showOpenRouterError = (error: OpenRouterError, diagnosticId: string) => {
    const title = getOpenRouterErrorTitle(error.code);

    notifications.show({
      title,
      message: buildNotificationMessage(error.message, diagnosticId),
      color: "red",
      autoClose: 10_000,
      withCloseButton: true,
    });
  };
}

const getOpenRouterErrorTitle = (code: number): string => {
  switch (code) {
    case 401:
      return "Authentication Error";
    case 402:
      return "Insufficient Credits";
    case 403:
      return "Content Moderation";
    case 408:
      return "Request Timeout";
    case 429:
      return "Rate Limited";
    case 502:
      return "Model Unavailable";
    case 503:
      return "No Provider Available";
    default:
      return code ? `API Error (${code})` : "API Error";
  }
};

const buildNotificationMessage = (message: string, diagnosticId: string) =>
  createElement(
    "button",
    {
      type: "button",
      onClick: () => getErrorDiagnosticsInstance().open(diagnosticId),
      style: {
        appearance: "none",
        background: "none",
        border: 0,
        color: "inherit",
        cursor: "pointer",
        padding: 0,
        textAlign: "left",
        textDecoration: "underline",
      },
      "aria-label": `${message}. View error details`,
    },
    message,
  );
