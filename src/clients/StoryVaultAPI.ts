import Config from "../Config";

export interface IGrokKeyAPI {
  hasValidGrokKey(): Promise<boolean>;
}

export class GrokKeyAPI implements IGrokKeyAPI {
  URL: string = "";

  AccessToken: string = "";

  constructor(accessToken: string) {
    if (!accessToken) throw new Error("Access token is required");
    this.URL = Config.storyVaultAPIURL;
    this.AccessToken = accessToken;
  }

  async hasValidGrokKey(): Promise<boolean> {
    const response = await fetch(`${this.URL}/api/hasValidGrokKey`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.AccessToken}`,
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
    const response = await fetch(`${this.URL}/api/saveGrokKey`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.AccessToken}`,
      },
      body: JSON.stringify({ grokKey: encryptedGrokKey }),
    });

    if (response.status != 201) {
      throw new Error(`Failed to save Grok key: ${response.status}`);
    }
  }
}
