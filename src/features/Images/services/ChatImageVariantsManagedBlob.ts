import { createManagedBlob } from "../../../services/Blob/ManagedBlob";
import type { ImageModelVariant } from "./ImageModelVariant";

export type ChatImageVariants = {
  selectedVariantId: string;
  variants: ImageModelVariant[];
};

export const getChatImageVariantsManagedBlobInstance =
  createManagedBlob<ChatImageVariants>("chat-image-variants");
