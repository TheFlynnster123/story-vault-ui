export interface ChatCreationWizardState {
  step: number;
  title: string;
  story: string;
  promptType: "Manual" | "First Person Character";
  customPrompt?: string;
  backgroundPhotoBase64?: string;
  backgroundPhotoCivitJobId?: string;
  generateImage: boolean;
}

export const createInitialWizardState = (): ChatCreationWizardState => ({
  step: 0,
  title: "",
  story: "",
  promptType: "First Person Character",
  customPrompt: "",
  generateImage: false,
});
