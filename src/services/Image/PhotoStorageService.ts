import { d } from "../Dependencies";
import type { PhotoData } from "./CivitJob";

/**
 * Service responsible for managing photo storage and retrieval
 */
export class PhotoStorageService {
  async getStoredPhoto(
    chatId: string,
    jobId: string
  ): Promise<string | undefined> {
    try {
      const photoData = (await d
        .CivitJobAPI()
        .getPhoto(chatId, jobId)) as PhotoData;

      return photoData.base64;
    } catch (error) {
      return undefined;
    }
  }

  async downloadAndSavePhoto(
    chatId: string,
    jobId: string,
    blobUrl: string
  ): Promise<string> {
    const base64 = await this.downloadBase64Photo(blobUrl);

    await d.CivitJobAPI().savePhoto(chatId, jobId, { base64 });

    return base64;
  }

  private async downloadBase64Photo(blobUrl: string) {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return await this.blobToBase64(blob);
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  }
}
