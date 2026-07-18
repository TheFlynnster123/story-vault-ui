import { createManagedBlob } from "../../../services/Blob/ManagedBlob";
import type { ImageModelVariant } from "./ImageModelVariant";

export type ChatImageVariants = {
  selectedVariantId: string;
  /**
   * The system model ID selected as the default for this chat.
   * Only used when no variant is selected. Falls back to the global
   * system default if this is empty or the model no longer exists.
   */
  selectedSystemModelId: string;
  variants: ImageModelVariant[];
  legacyMigration?: {
    status: "migrated" | "partial";
    message: string;
  };
};

export const getChatImageVariantsManagedBlobInstance =
  createManagedBlob<ChatImageVariants>("chat-image-variants");
