import { d } from "../../../services/Dependencies";
import Config from "../../../services/Config";

interface IOpenRouterKeyAPI {
  hasValidOpenRouterKey(): Promise<boolean>;
}

export class OpenRouterKeyAPI implements IOpenRouterKeyAPI {
  URL: string = "";

  constructor() {
    this.URL = Config.storyVaultAPIURL;
  }

  async hasValidOpenRouterKey(): Promise<boolean> {
    const accesstoken = await d.AuthAPI().getAccessToken();

    const response = await fetch(`${this.URL}/api/hasValidOpenRouterKey`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accesstoken}`,
      },
    });

    if (response.status == 200) {
      return true;
    } else if (response.status == 404) {
      return false;
    }

    throw new Error(`Unexpected response status: ${response.status}`);
  }

  async saveOpenRouterKey(encryptedOpenRouterKey: string): Promise<void> {
    const accesstoken = await d.AuthAPI().getAccessToken();

    const response = await fetch(`${this.URL}/api/saveOpenRouterKey`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accesstoken}`,
      },
      body: JSON.stringify({ openRouterKey: encryptedOpenRouterKey }),
    });

    if (response.status != 201) {
      throw new Error(`Failed to save OpenRouter key: ${response.status}`);
    }
  }
}
