export interface ChatCreationWizardState {
  step: number;
  title: string;
  story: string;
  promptType: "Manual" | "System Default" | "Preset";
  selectedPromptPresetId?: string;
  prompt?: string;
  backgroundPhotoBase64?: string;
  backgroundPhotoWorkflowId?: string;
  /** Legacy compatibility field. New writes should use backgroundPhotoWorkflowId. */
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
