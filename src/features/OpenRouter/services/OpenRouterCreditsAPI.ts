import { d } from "../../../services/Dependencies";
import Config from "../../../services/Config";

export const getOpenRouterCreditsQueryKey = () => ["openrouter-credits"];

export interface OpenRouterCredits {
  /** Remaining credit on the current API key in USD */
  limitRemaining: number;
  /** Current key usage in USD across all time */
  usage: number;
  /** Current key usage in USD for the current UTC day */
  usageDaily: number;
  /** Current key usage in USD for the current UTC week */
  usageWeekly: number;
  /** Current key usage in USD for the current UTC month */
  usageMonthly: number;
  /** Credit limit if set, null otherwise */
  limit: number | null;
  /** Limit reset cadence, e.g. weekly */
  limitReset: string | null;
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
      limitRemaining: data.limit_remaining,
      usage: data.usage,
      usageDaily: data.usage_daily,
      usageWeekly: data.usage_weekly,
      usageMonthly: data.usage_monthly,
      limit: data.limit,
      limitReset: data.limit_reset,
      isFreeTier: data.is_free_tier,
      label: data.label,
    };
  }
}
