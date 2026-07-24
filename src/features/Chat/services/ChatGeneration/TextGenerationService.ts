import { d } from "../../../../services/Dependencies";
import { GenerationOrchestrator } from "./GenerationOrchestrator";
import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";
import type { OpenRouterRequestSettings } from "../../../OpenRouter/services/OpenRouterRequestSettings";

export const getTextGenerationServiceInstance = createInstanceCache(
  (chatId: string) => new TextGenerationService(chatId),
);

export class TextGenerationService extends GenerationOrchestrator {
  private chatId: string;

  constructor(chatId: string) {
    super();
    this.chatId = chatId;
  }

  private async getChatModelOverride(): Promise<
    | {
        model?: string;
        requestSettings?: OpenRouterRequestSettings;
      }
    | undefined
  > {
    const chatSettings = await d.ChatSettingsService(this.chatId).Get();
    if (!chatSettings?.modelOverride) return undefined;

    return {
      model: chatSettings.modelOverride,
      requestSettings:
        chatSettings.modelRequestSettingsOverride ??
        (chatSettings.modelReasoningEffortOverride
          ? { reasoning: { effort: chatSettings.modelReasoningEffortOverride } }
          : undefined),
    };
  }

  private async getReasoningModelOverride(): Promise<
    | {
        model?: string;
        requestSettings?: OpenRouterRequestSettings;
      }
    | undefined
  > {
    const chatSettings = await d.ChatSettingsService(this.chatId).Get();
    if (chatSettings?.reasoningModelOverride) {
      return {
        model: chatSettings.reasoningModelOverride,
        requestSettings: chatSettings.reasoningModelRequestSettingsOverride,
      };
    }
    return this.getChatModelOverride();
  }

  async generateResponse(
    userInput = "",
    guidance?: string,
  ): Promise<string | undefined> {
    return this.orchestrate(async () => {
      const previousMessage = d
        .UserChatProjection(this.chatId)
        .GetLastPersistedTextMessage();

      if (userInput.trim()) {
        await d.ChatService(this.chatId).AddUserMessage(userInput);
        void this.runPostUserMessageTasks();
      }

      d.PlanGenerationService(this.chatId).onMessageSent();

      if (
        previousMessage?.type !== "reasoning" &&
        (await this.shouldGenerateReasoning())
      ) {
        await this.generateReasoning(guidance);
      }

      const requestMessages = await d
        .LLMMessageContextService(this.chatId)
        .buildGenerationRequestMessages(true, guidance);

      this.setStatus("Generating response...");

      const modelOverride = await this.getChatModelOverride();
      const streamingId = crypto.randomUUID();
      const projection = d.UserChatProjection(this.chatId);
      projection.addStreamingMessage(streamingId);

      try {
        const response = await d.OpenRouterChatAPI().postChatStream(
          requestMessages,
          (content) => {
            projection.updateStreamingMessage(content);
          },
          modelOverride?.model,
          modelOverride?.requestSettings,
        );

        this.setStatus("Saving...");
        await d.ChatService(this.chatId).AddAssistantMessage(response);
        projection.removeStreamingMessage();

        return response;
      } catch (error) {
        projection.removeStreamingMessage();
        throw error;
      }
    });
  }

  private async runPostUserMessageTasks(): Promise<void> {
    void d
      .CharacterMaintenanceService(this.chatId)
      .maybeCreateProposalAfterSavedUserTurn();

    try {
      const chatSettingsService = d.ChatSettingsService(this.chatId);
      const settings = await chatSettingsService.Get();
      if (!settings?.agentFlowAutoRunEnabled) return;

      const interval = Math.max(1, settings.agentFlowAutoRunInterval ?? 3);
      const nextCount = (settings.agentFlowMessagesSinceLastRun ?? 0) + 1;

      if (nextCount < interval) {
        await chatSettingsService.update({
          agentFlowMessagesSinceLastRun: nextCount,
        });
        return;
      }

      await chatSettingsService.update({
        agentFlowMessagesSinceLastRun: 0,
      });
      await d.AgentFlowService(this.chatId).analyzeAutomaticSuggestion();
    } catch (error) {
      d.ErrorService().log("Failed to auto-run agent flow", error);
    }
  }

  private async shouldGenerateReasoning(): Promise<boolean> {
    const chatSettings = await d.ChatSettingsService(this.chatId).Get();
    return chatSettings?.reasoningEnabled ?? true;
  }

  private async generateReasoning(guidance?: string): Promise<void> {
    const requestMessages = await d
      .LLMMessageContextService(this.chatId)
      .buildReasoningRequestMessages(guidance);

    this.setStatus("Reasoning...");

    const modelOverride = await this.getReasoningModelOverride();
    const reasoning = await d
      .OpenRouterChatAPI()
      .postChat(
        requestMessages,
        modelOverride?.model,
        "chat",
        "Reasoning",
        modelOverride?.requestSettings,
      );

    if (reasoning.trim()) {
      await d.ChatService(this.chatId).AddReasoningMessage(reasoning);
    }
  }

  async regenerateResponse(
    messageId: string,
    feedback?: string,
  ): Promise<string | undefined> {
    const message = d.LLMChatProjection(this.chatId).GetMessage(messageId);

    if (!message) {
      console.warn(`Message with id ${messageId} not found`);
      return;
    }

    return this.orchestrate(async () => {
      const originalContent = message.content;

      d.PlanGenerationService(this.chatId).onMessageSent();

      const requestMessages = await d
        .LLMMessageContextService(this.chatId)
        .buildRegenerationRequestMessages(messageId, originalContent, feedback);

      this.setStatus("Generating response...");

      const modelOverride = await this.getChatModelOverride();
      const projection = d.UserChatProjection(this.chatId);
      projection.startStreamingExistingMessage(messageId);

      try {
        const response = await d.OpenRouterChatAPI().postChatStream(
          requestMessages,
          (content) => {
            projection.updateStreamingMessage(content);
          },
          modelOverride?.model,
          modelOverride?.requestSettings,
        );

        this.setStatus("Saving....");
        await d.ChatService(this.chatId).EditMessage(messageId, response);
        projection.removeStreamingMessage();

        return response;
      } catch (error) {
        projection.removeStreamingMessage();
        throw error;
      }
    });
  }
}
