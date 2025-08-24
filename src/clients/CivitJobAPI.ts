import config from "../Config";
import { EncryptionManager } from "../Managers/EncryptionManager";
import { AuthAPI } from "./AuthAPI";
import type { ImageGenerationSettings } from "../models/ImageGenerationSettings";

export class CivitJobAPI {
  public URL: string;
  public encryptionManager: EncryptionManager;
  public authAPI: AuthAPI;

  constructor() {
    this.URL = config.storyVaultAPIURL;
    this.authAPI = new AuthAPI();
    this.encryptionManager = new EncryptionManager();
  }

  public async savePhoto(
    chatId: string,
    photoName: string,
    photoData: object
  ): Promise<boolean> {
    const accessToken = await this.authAPI.getAccessToken();
    await this.encryptionManager.ensureKeysInitialized();

    const photoContent = JSON.stringify(photoData);
    const encryptedContent = await this.encryptionManager.encryptString(
      this.encryptionManager.civitaiEncryptionKey!,
      photoContent
    );

    const body = { chatId, photoName, photoData: encryptedContent };

    const requestInit = buildSavePhotoRequest(body, accessToken);
    const response = await fetch(`${this.URL}/api/SavePhoto`, requestInit);

    if (response.ok) {
      return true;
    } else {
      console.error("Failed to save photo:", response.statusText);
      return false;
    }
  }

  public async getPhoto(chatId: string, photoName: string): Promise<object> {
    const accessToken = await this.authAPI.getAccessToken();

    const body = { chatId, photoName };

    const requestInit = buildGetPhotoRequest(body, accessToken);
    const response = await fetch(`${this.URL}/api/GetPhoto`, requestInit);

    if (response.ok) {
      const { photoData } = await response.json();
      await this.encryptionManager.ensureKeysInitialized();
      const decryptedContent = await this.encryptionManager.decryptString(
        this.encryptionManager.civitaiEncryptionKey!,
        photoData
      );
      return JSON.parse(decryptedContent);
    } else {
      console.error("Failed to get photo:", response.statusText);
      throw new Error(`Error fetching photo: ${response.statusText}`);
    }
  }

  public async getJobStatus(jobId: string): Promise<any> {
    const accessToken = await this.authAPI.getAccessToken();
    await this.encryptionManager.ensureKeysInitialized();

    const encryptionKey = this.encryptionManager.civitaiEncryptionKey!;

    const body = { jobId };

    const requestInit = buildGetJobStatusRequest(
      body,
      accessToken,
      encryptionKey
    );
    const response = await fetch(`${this.URL}/api/GetJobStatus`, requestInit);

    if (response.ok) {
      return response.json();
    } else {
      console.error("Failed to get job status:", response.statusText);
      throw new Error(`Error fetching job status: ${response.statusText}`);
    }
  }

  public async generateImage(settings: ImageGenerationSettings): Promise<any> {
    const accessToken = await this.authAPI.getAccessToken();
    await this.encryptionManager.ensureKeysInitialized();

    const encryptionKey = this.encryptionManager.civitaiEncryptionKey!;

    const requestInit = buildGenerateImageRequest(
      settings,
      accessToken,
      encryptionKey
    );
    const response = await fetch(`${this.URL}/api/GenerateImage`, requestInit);

    if (response.ok) {
      return response.json();
    } else {
      console.error("Failed to generate image:", response.statusText);
      throw new Error(`Error generating image: ${response.statusText}`);
    }
  }
}

function buildSavePhotoRequest(
  body: { chatId: string; photoName: string; photoData: string },
  accessToken: string
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
  accessToken: string
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

function buildGetJobStatusRequest(
  body: { jobId: string },
  accessToken: string,
  encryptionKey: string
): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      EncryptionKey: encryptionKey,
    },
    body: JSON.stringify(body),
  };
}

function buildGenerateImageRequest(
  body: ImageGenerationSettings,
  accessToken: string,
  encryptionKey: string
): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      EncryptionKey: encryptionKey,
    },
    body: JSON.stringify(body),
  };
}
