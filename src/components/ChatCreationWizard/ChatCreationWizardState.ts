import { d } from "../../services/Dependencies";

export interface ChatCreationWizardState {
  step: number;
  title: string;
  story: string;
  promptType: "Manual" | "First Person" | "Third Person";
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
    promptType: "Third Person",
    prompt: d.DefaultPrompts().ThirdPersonChatPrompt(),
    generateImage: false,
  };
};
