import { CivitJobAPI } from "../clients/CivitJobAPI";
import type { PhotoData } from "../types/CivitJob";

/**
 * Service responsible for managing photo storage and retrieval
 */
export class PhotoStorageService {
  private civitJobAPI: CivitJobAPI;

  constructor() {
    this.civitJobAPI = new CivitJobAPI();
  }

  async getStoredPhoto(chatId: string, jobId: string): Promise<string | null> {
    try {
      const photoData = (await this.civitJobAPI.getPhoto(
        chatId,
        jobId
      )) as PhotoData;
      return photoData.base64;
    } catch (error) {
      // Photo not found in database
      return null;
    }
  }

  async downloadAndSavePhoto(
    chatId: string,
    jobId: string,
    blobUrl: string
  ): Promise<string> {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    const base64 = await this.blobToBase64(blob);

    const photoDataToSave: PhotoData = { base64 };
    await this.civitJobAPI.savePhoto(chatId, jobId, photoDataToSave);

    return base64;
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
