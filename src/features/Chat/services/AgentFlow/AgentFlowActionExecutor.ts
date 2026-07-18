import { v4 as uuidv4 } from "uuid";
import { d } from "../../../../services/Dependencies";
import type { AgentFlowAction } from "./AgentFlowService";

export interface AgentFlowActionDestinations {
  openChapterDraft: (title?: string, summary?: string) => void;
  openClarificationDraft: (question: string, options?: string[]) => void;
  openMemories: () => void;
  openNoteDraft: (content?: string) => void;
  openPlans: () => void;
}

export const executeAgentFlowAction = async (
  chatId: string,
  action: AgentFlowAction,
  destinations: AgentFlowActionDestinations,
): Promise<string> => {
  switch (action.tool) {
    case "save_memory": {
      const content = getStringArg(action, "content");
      if (!content) {
        destinations.openMemories();
        return "Opened memories.";
      }
      await d.MemoriesService(chatId).saveMemory({
        id: uuidv4(),
        content,
      });
      return "Memory saved.";
    }
    case "add_note": {
      const content = getStringArg(action, "content");
      if (!content) {
        destinations.openNoteDraft();
        return "Opened note editor.";
      }
      await d
        .ChatService(chatId)
        .AddNote(content, getNumberArg(action, "expiresAfterMessages"));
      return "Note added.";
    }
    case "generate_image":
      await d.ImageGenerationService(chatId).generateImage();
      return "Image generation started.";
    case "refresh_plan": {
      const planId =
        getStringArg(action, "planId") ||
        getStringArg(action, "planDefinitionId");
      if (!planId) {
        destinations.openPlans();
        return "Opened plans.";
      }
      await d.PlanGenerationService(chatId).generatePlanNow(planId);
      return "Plan refresh started.";
    }
    case "create_chapter":
      destinations.openChapterDraft(
        getStringArg(action, "title"),
        getStringArg(action, "summary"),
      );
      return "Opened chapter editor.";
    case "ask_user":
      destinations.openClarificationDraft(
        getStringArg(action, "question") || action.reason,
        getStringArrayArg(action, "options") ||
          getStringArrayArg(action, "answers") ||
          getStringArrayArg(action, "choices") ||
          [],
      );
      return "Opened clarification prompt.";
  }
};

const getStringArg = (
  action: AgentFlowAction,
  key: string,
): string | undefined => {
  const value = action.args[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const getNumberArg = (
  action: AgentFlowAction,
  key: string,
): number | null => {
  const value = action.args[key];
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const getStringArrayArg = (
  action: AgentFlowAction,
  key: string,
): string[] | undefined => {
  const value = action.args[key];
  if (!Array.isArray(value)) return undefined;

  const options = value.filter(
    (option): option is string =>
      typeof option === "string" && option.trim().length > 0,
  );

  return options.length > 0 ? options : undefined;
};
