import { notifications } from "@mantine/notifications";
import { OpenRouterError } from "../features/OpenRouter/services/OpenRouterError";

export interface IErrorService {
  log: (message: string, error?: unknown) => void;
}

export class ErrorService implements IErrorService {
  log = (message: string, error?: unknown) => {
    console.error(message, error);

    if (error instanceof OpenRouterError) {
      this.showOpenRouterError(error);
      return;
    }

    notifications.show({
      message: message,
      color: "red",
      autoClose: 5000,
      withCloseButton: true,
    });
  };

  private showOpenRouterError = (error: OpenRouterError) => {
    const title = getOpenRouterErrorTitle(error.code);

    notifications.show({
      title,
      message: error.message,
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
