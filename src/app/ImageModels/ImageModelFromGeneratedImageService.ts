import { d } from "../Dependencies/Dependencies";
import type { ImageModel } from "./ImageModel";

export class ImageModelFromGeneratedImageService {
  public async GenerateImageModel(
    imageIdOrUrl: string
  ): Promise<ImageModel | null> {
    const imageId = d.ImageIdExtractor().extract(imageIdOrUrl);

    if (!imageId)
      throw new Error("Could not get an image Id from the provided input!");

    const generatedImage = await d.GeneratedImageQuery().Get(imageId);

    if (!generatedImage)
      throw new Error(
        "Could not fetch generated image data from the provided ID!"
      );

    return d.ImageModelMapper().FromGeneratedImage(generatedImage);
  }
}
