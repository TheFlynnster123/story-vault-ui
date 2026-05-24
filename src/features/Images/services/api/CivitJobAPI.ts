import Config from "../../../../services/Config";
import type { PhotoData } from "../CivitJob";
import { d } from "../../../../services/Dependencies";

/**
 * Photo storage API - handles saving/loading generated images to/from Azure Blob Storage.
 * This is separate from the generation workflow and does NOT use the civitai SDK.
 */
export class CivitJobAPI {
  public URL: string;

  constructor() {
    this.URL = Config.storyVaultAPIURL;
  }

  public async savePhoto(
    chatId: string,
    photoName: string,
    photoData: PhotoData,
  ): Promise<void> {
    const accessToken = await d.AuthAPI().getAccessToken();

    const photoContent = JSON.stringify(photoData);
    const encryptedContent = await d
      .EncryptionManager()
      .encryptString("civitai", photoContent);

    const body = { chatId, photoName, photoData: encryptedContent };

    const requestInit = buildSavePhotoRequest(body, accessToken);
    const response = await fetch(`${this.URL}/api/SavePhoto`, requestInit);

    if (!response.ok) {
      throw new Error("Failed to save photo: " + response.statusText);
    }
  }

  public async getPhoto(chatId: string, photoName: string): Promise<object> {
    const accessToken = await d.AuthAPI().getAccessToken();

    const body = { chatId, photoName };

    const requestInit = buildGetPhotoRequest(body, accessToken);
    const response = await fetch(`${this.URL}/api/GetPhoto`, requestInit);

    if (response.ok) {
      const { photoData } = await response.json();

      const decryptedContent = await d
        .EncryptionManager()
        .decryptString("civitai", photoData);

      return JSON.parse(decryptedContent);
    } else {
      throw new Error(`Error fetching photo: ${response.statusText}`);
    }
  }
}

function buildSavePhotoRequest(
  body: { chatId: string; photoName: string; photoData: string },
  accessToken: string,
): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  };
}

function buildGetPhotoRequest(
  body: { chatId: string; photoName: string },
  accessToken: string,
): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  };
}
