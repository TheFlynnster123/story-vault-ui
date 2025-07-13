import config from "../Config";
import { AuthAPI } from "./AuthAPI";

export interface IGrokKeyAPI {
  hasValidGrokKey(): Promise<boolean>;
}

export class GrokKeyAPI implements IGrokKeyAPI {
  URL: string = "";

  authAPI: AuthAPI;

  constructor() {
    this.URL = config.storyVaultAPIURL;

    this.authAPI = new AuthAPI();
  }

  async hasValidGrokKey(): Promise<boolean> {
    const accesstoken = await this.authAPI.getAccessToken();

    const response = await fetch(`${this.URL}/api/hasValidGrokKey`, {
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

  async saveGrokKey(encryptedGrokKey: string): Promise<void> {
    const accesstoken = await this.authAPI.getAccessToken();

    const response = await fetch(`${this.URL}/api/saveGrokKey`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accesstoken}`,
      },
      body: JSON.stringify({ grokKey: encryptedGrokKey }),
    });

    if (response.status != 201) {
      throw new Error(`Failed to save Grok key: ${response.status}`);
    }
  }
}
