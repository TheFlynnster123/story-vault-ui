import { d } from "../../../../services/Dependencies";

export type CivitModelImage = {
  url: string;
  type: "image" | "video";
};

export type CivitModelVersion = {
  images: CivitModelImage[];
};

export type CivitModelInfo = {
  modelVersions: CivitModelVersion[];
};

export type ModelPreview = {
  url: string;
  type: "image" | "video";
};

export class CivitModelInfoQuery {
  public async GetPreview(modelId: number): Promise<ModelPreview | undefined> {
    try {
      const modelInfo = await this.fetchModelInfo(modelId);
      return this.extractPreview(modelInfo);
    } catch (error) {
      d.ErrorService().log(
        `Failed to fetch model preview for model ${modelId}`,
        error,
      );
      return undefined;
    }
  }

  extractPreview(
    modelInfo: CivitModelInfo | undefined,
  ): ModelPreview | undefined {
    if (!modelInfo) return undefined;

    const latestVersion = modelInfo.modelVersions?.[0];
    if (!latestVersion) return undefined;

    const firstImage = latestVersion.images?.[0];
    if (!firstImage) return undefined;

    return {
      url: firstImage.url,
      type: firstImage.type === "video" ? "video" : "image",
    };
  }

  async fetchModelInfo(modelId: number): Promise<CivitModelInfo | undefined> {
    const url = `https://civitai.com/api/v1/models/${modelId}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      d.ErrorService().log(
        `Failed to fetch model info: ${response.status} ${response.statusText}`,
        new Error(`HTTP ${response.status}`),
      );
      return undefined;
    }

    return await response.json();
  }
}
