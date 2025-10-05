import type { FromTextInput } from "civitai/dist/types/Inputs";

export type ImageModel = {
  id: string;
  name: string;

  /**
   * The image input parameters used to generate an image via CivitAI.
   */
  input: FromTextInput;
};
