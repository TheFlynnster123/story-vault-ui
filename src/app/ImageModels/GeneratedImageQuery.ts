import type { GeneratedImage } from "./GeneratedImage";
import { d } from "../Dependencies/Dependencies";

export class GeneratedImageQuery {
  /**
   * Fetches generated image data from the external API.
   * @param imageId The identifier of the image to fetch.
   * */
  public async Get(imageId: string): Promise<GeneratedImage | undefined> {
    try {
      const url = this.buildApiUrl(imageId);
      const response = await this.makeApiRequest(url);

      if (!response) {
        throw new Error("Failed to fetch data from API");
      }

      const parsedData = await this.parseResponse(response);
      if (!parsedData) {
        throw new Error("Failed to parse response data");
      }

      return parsedData;
    } catch (error) {
      d.ErrorService().log("Failed to generate image model", error);
      return undefined;
    }
  }

  buildApiUrl = (imageId: string): string =>
    `https://civitai.com/api/generation/data?type=image&id=${imageId}`;

  async makeApiRequest(url: string): Promise<Response | null> {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      d.ErrorService().log(
        `Failed to fetch image data: ${response.status} ${response.statusText}`,
        new Error(`HTTP ${response.status}`)
      );
      return null;
    }

    return response;
  }

  async parseResponse(response: Response): Promise<GeneratedImage | null> {
    try {
      return await response.json();
    } catch (error) {
      d.ErrorService().log("Failed to parse response", error);
      return null;
    }
  }
}
