import Config from "../Config";

export interface ICivitaiAPI {
  hasValidCivitaiKey(): Promise<boolean>;
  saveCivitaiKey(encryptedCivitaiKey: string): Promise<void>;
}

export class CivitaiAPI implements ICivitaiAPI {
  URL: string = "";

  AccessToken: string = "";

  constructor(accessToken: string) {
    if (!accessToken) throw new Error("Access token is required");
    this.URL = Config.storyVaultAPIURL;
    this.AccessToken = accessToken;
  }

  async hasValidCivitaiKey(): Promise<boolean> {
    const response = await fetch(`${this.URL}/api/HasValidCivitaiKey`, {
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

  async saveCivitaiKey(encryptedCivitaiKey: string): Promise<void> {
    const response = await fetch(`${this.URL}/api/SaveCivitaiKey`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.AccessToken}`,
      },
      body: JSON.stringify({ civitaiKey: encryptedCivitaiKey }),
    });

    if (response.status != 201) {
      throw new Error(`Failed to save Civitai key: ${response.status}`);
    }
  }
}
