export interface ChatCreationWizardState {
  step: number;
  title: string;
  story: string;
  promptType: "Manual" | "System Default" | "Preset";
  selectedPromptPresetId?: string;
  prompt?: string;
  backgroundPhotoBase64?: string;
  backgroundPhotoCivitJobId?: string;
  generateImage: boolean;
}

export const createInitialWizardState = (): ChatCreationWizardState => {
  return {
    step: 0,
    title: "",
    story: "",
    promptType: "System Default",
    prompt: "",
    generateImage: false,
  };
};
