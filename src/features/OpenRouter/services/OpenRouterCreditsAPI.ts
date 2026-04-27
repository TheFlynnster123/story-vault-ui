import { d } from "../../../services/Dependencies";
import Config from "../../../services/Config";

export interface OpenRouterCredits {
  /** Current balance in USD */
  balance: number;
  /** Total usage in USD */
  usage: number;
  /** Credit limit if set, null otherwise */
  limit: number | null;
  /** Whether account is on free tier */
  isFreeTier: boolean;
  /** Label/name for the API key */
  label?: string;
}

export class OpenRouterCreditsAPI {
  URL: string = "";
  OPENROUTER_CREDITS_ROUTE: string = "/api/openrouter/auth/key";

  constructor() {
    this.URL = Config.storyVaultAPIURL;
  }

  async getCredits(): Promise<OpenRouterCredits> {
    const accessToken = await d.AuthAPI().getAccessToken();
    const encryptionKey = await d
      .EncryptionManager()
      .getOpenRouterEncryptionKey();

    const response = await fetch(
      `${this.URL}${this.OPENROUTER_CREDITS_ROUTE}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          EncryptionKey: encryptionKey,
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch OpenRouter credits: ${response.status} ${response.statusText}`,
      );
    }

    const json = await response.json();
    const data = json.data;
    return {
      balance: data.limit_remaining,
      usage: data.usage,
      limit: data.limit,
      isFreeTier: data.is_free_tier,
      label: data.label,
    };
  }
}
