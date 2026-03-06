import { useEffect, useState } from "react";
import { d } from "../../../services/Dependencies";
import type { SystemPrompts } from "../services/SystemPrompts";
import { DEFAULT_SYSTEM_PROMPTS } from "../services/SystemPrompts";

interface UseSystemPromptsResult {
  systemPrompts: SystemPrompts;
  isLoading: boolean;
  saveSystemPrompts: (systemPrompts: SystemPrompts) => Promise<void>;
}

export const useSystemPrompts = (): UseSystemPromptsResult => {
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompts>({
    newStoryPrompt: "",
    defaultFirstPersonPrompt: "",
    defaultThirdPersonPrompt: "",
    defaultImagePrompt: "",
  });
  const [isLoading, setIsLoading] = useState(true);

  const blob = () => d.SystemPromptsManagedBlob();

  const loadPrompts = async () => {
    const data = await blob().get();
    // Default to DEFAULT_SYSTEM_PROMPTS if no data exists
    setSystemPrompts(data || DEFAULT_SYSTEM_PROMPTS);
    setIsLoading(false);
  };

  useEffect(() => {
    const unsubscribe = blob().subscribe(() => {
      loadPrompts();
    });

    loadPrompts();

    return () => {
      unsubscribe();
    };
  }, []);

  const saveSystemPrompts = async (
    newPrompts: SystemPrompts,
  ): Promise<void> => {
    await blob().save(newPrompts);
  };

  return {
    systemPrompts,
    isLoading,
    saveSystemPrompts,
  };
};
