import { createGlobalManagedBlob } from "../../../services/Blob/ManagedBlob";
import type { ChatPromptPresets } from "./ChatPromptPresets";

export const getChatPromptPresetsManagedBlobInstance =
  createGlobalManagedBlob<ChatPromptPresets>("chat-prompt-presets");

