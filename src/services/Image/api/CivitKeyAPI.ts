import { d } from "../../Dependencies";
import Config from "../../../components/Common/Config";

interface ICivitaiAPI {
  hasValidCivitaiKey(): Promise<boolean>;
  saveCivitaiKey(encryptedCivitaiKey: string): Promise<void>;
}

export class CivitKeyAPI implements ICivitaiAPI {
  URL: string = "";

  constructor() {
    this.URL = Config.storyVaultAPIURL;
  }

  async hasValidCivitaiKey(): Promise<boolean> {
    const accessToken = await d.AuthAPI().getAccessToken();

    const response = await fetch(`${this.URL}/api/HasValidCivitaiKey`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
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
    const accessToken = await d.AuthAPI().getAccessToken();

    const response = await fetch(`${this.URL}/api/SaveCivitaiKey`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ civitaiKey: encryptedCivitaiKey }),
    });

    if (response.status != 201) {
      throw new Error(`Failed to save Civitai key: ${response.status}`);
    }
  }
}
