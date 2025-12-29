import type { FromTextInput } from "civitai/dist/types/Inputs";
import Config from "../../../components/Common/Config";
import type { CivitJobStatus, PhotoData } from "../CivitJob";
import { d } from "../../Dependencies";

export class CivitJobAPI {
  public URL: string;

  constructor() {
    this.URL = Config.storyVaultAPIURL;
  }

  public async savePhoto(
    chatId: string,
    photoName: string,
    photoData: PhotoData
  ): Promise<boolean> {
    const accessToken = await d.AuthAPI().getAccessToken();

    const photoContent = JSON.stringify(photoData);
    const encryptedContent = await d
      .EncryptionManager()
      .encryptString("civitai", photoContent);

    const body = { chatId, photoName, photoData: encryptedContent };

    const requestInit = buildSavePhotoRequest(body, accessToken);
    const response = await fetch(`${this.URL}/api/SavePhoto`, requestInit);

    if (response.ok) {
      return true;
    } else {
      d.ErrorService().log("Failed to save photo: " + response.statusText);
      return false;
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
      d.ErrorService().log("Failed to get photo: " + response.statusText);
      throw new Error(`Error fetching photo: ${response.statusText}`);
    }
  }

  public async getJobStatus(jobId: string): Promise<CivitJobStatus> {
    const accessToken = await d.AuthAPI().getAccessToken();

    const encryptionKey = await d.EncryptionManager().getCivitaiEncryptionKey();

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
      d.ErrorService().log("Failed to get job status:", response.statusText);
      return { scheduled: false, result: [] };
    }
  }

  public async generateImage(input: FromTextInput): Promise<any> {
    const accessToken = await d.AuthAPI().getAccessToken();

    const encryptionKey = await d.EncryptionManager().getCivitaiEncryptionKey();

    const requestInit = buildGenerateImageRequest(
      input,
      accessToken,
      encryptionKey
    );

    const response = await fetch(`${this.URL}/api/GenerateImage`, requestInit);

    if (response.ok) {
      return response.json();
    } else {
      this.logError(response);
      throw new Error(`Error generating image: ${response.statusText}`);
    }
  }

  private async logError(response: Response) {
    try {
      const fullErrorJson = await response.json();
      console.log(fullErrorJson);
    } finally {
      d.ErrorService().log("Error from CivitAPI: " + response.statusText);
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
  body: FromTextInput,
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
