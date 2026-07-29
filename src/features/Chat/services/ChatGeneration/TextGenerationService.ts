import { d } from "../../../../services/Dependencies";
import { GenerationOrchestrator } from "./GenerationOrchestrator";
import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";
import type { OpenRouterRequestSettings } from "../../../OpenRouter/services/OpenRouterRequestSettings";
import type { TrackedContextTrace } from "../../../OpenRouter/services/RequestTracker";
import {
  toSystemMessage,
  toUserMessage,
} from "../../../../services/Utils/MessageUtils";
import {
  DEFAULT_SYSTEM_PROMPTS,
  type SystemPrompts,
} from "../../../Prompts/services/SystemPrompts";
import type { ChatSettings } from "../Chat/ChatSettings";
import {
  renderConsolidatedReasoningContext,
} from "./ContextDocument";
import type {
  ContextRequest,
  LLMContextSelection,
} from "./LLMMessageContextService";

const TEXT_CONTEXT_SELECTION = {
  history: true,
  memories: true,
  characterSheets: true,
  continuityHistories: true,
  plans: true,
} as const satisfies LLMContextSelection;

type TextAppendedSource =
  | "response-prompt"
  | "reasoning-prompt"
  | "guidance"
  | "regeneration-feedback";

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

      const request = await this.buildResponseRequest(guidance);

      this.setStatus("Generating response...");

      const modelOverride = await this.getChatModelOverride();
      const streamingId = crypto.randomUUID();
      const projection = d.UserChatProjection(this.chatId);
      projection.addStreamingMessage(streamingId);

      try {
        const response = await d.OpenRouterChatAPI().postChatStream(
          request.messages,
          (content) => {
            projection.updateStreamingMessage(content);
          },
          modelOverride?.model,
          modelOverride?.requestSettings,
          "chat",
          "Chat",
          request.trace,
        );

        this.setStatus("Saving...");
        await d.ChatService(this.chatId).AddAssistantResponse(response);
        projection.removeStreamingMessage();
        void d
          .MessageCompressionService(this.chatId)
          .compressEligibleMessages();

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
    void d
      .ContinuityHistoryMaintenanceService(this.chatId)
      .onSavedUserTurn()
      .catch((error) =>
        d.ErrorService().log(
          "Failed to run continuity history maintenance",
          error,
        ),
      );

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
    const request = await this.buildReasoningRequest(guidance);

    this.setStatus("Reasoning...");

    const modelOverride = await this.getReasoningModelOverride();
    const projection = d.UserChatProjection(this.chatId);
    const streamingId = crypto.randomUUID();
    projection.addStreamingMessage(streamingId, "reasoning");

    try {
      const reasoning = await d.OpenRouterChatAPI().postChatStream(
        request.messages,
        (content) => {
          projection.updateStreamingMessage(content);
        },
        modelOverride?.model,
        modelOverride?.requestSettings,
        "chat",
        "Reasoning",
        request.trace,
      );

      await d.ChatService(this.chatId).AddReasoningMessage(reasoning);
      projection.removeStreamingMessage();
    } catch (error) {
      projection.removeStreamingMessage();
      throw error;
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

      const request = await this.buildRegenerationRequest(
        messageId,
        originalContent,
        feedback,
      );

      this.setStatus("Generating response...");

      const modelOverride = await this.getChatModelOverride();
      const projection = d.UserChatProjection(this.chatId);
      projection.startStreamingExistingMessage(messageId);

      try {
        const response = await d.OpenRouterChatAPI().postChatStream(
          request.messages,
          (content) => {
            projection.updateStreamingMessage(content);
          },
          modelOverride?.model,
          modelOverride?.requestSettings,
          "chat",
          "Chat",
          request.trace,
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

  private async buildResponseRequest(guidance?: string): Promise<{
    messages: ContextRequest["messages"];
    trace: TrackedContextTrace;
  }> {
    const [context, chatSettings] = await Promise.all([
      d
        .LLMMessageContextService(this.chatId)
        .buildContextWithTrace(TEXT_CONTEXT_SELECTION),
      d.ChatSettingsService(this.chatId).Get() as Promise<ChatSettings>,
    ]);
    const messages = [
      ...context.messages,
      toUserMessage(chatSettings.prompt),
    ];
    const appendedSources: TextAppendedSource[] = ["response-prompt"];

    if (hasText(guidance)) {
      messages.push(toUserMessage(formatGuidanceMessage(guidance)));
      appendedSources.push("guidance");
    }

    return withAppendedSources(context, messages, appendedSources);
  }

  private async buildReasoningRequest(guidance?: string): Promise<{
    messages: ContextRequest["messages"];
    trace: TrackedContextTrace;
  }> {
    const [context, chatSettings, systemPrompts] = await Promise.all([
      d
        .LLMMessageContextService(this.chatId)
        .buildContextWithTrace(TEXT_CONTEXT_SELECTION),
      d.ChatSettingsService(this.chatId).Get() as Promise<ChatSettings>,
      d.SystemPromptsService().Get(),
    ]);
    const reasoningPrompt = resolveReasoningPrompt(
      chatSettings,
      systemPrompts,
    );
    const messages =
      chatSettings.reasoningConsolidateMessageHistory ?? true
        ? [
            toSystemMessage(
              renderConsolidatedReasoningContext(
                context.document,
                reasoningPrompt,
              ),
            ),
          ]
        : [...context.messages, toSystemMessage(reasoningPrompt)];
    const appendedSources: TextAppendedSource[] = ["reasoning-prompt"];

    if (hasText(guidance)) {
      messages.push(toUserMessage(formatGuidanceMessage(guidance)));
      appendedSources.push("guidance");
    }

    return withAppendedSources(context, messages, appendedSources);
  }

  private async buildRegenerationRequest(
    messageId: string,
    originalContent: string,
    feedback?: string,
  ): Promise<{
    messages: ContextRequest["messages"];
    trace: TrackedContextTrace;
  }> {
    const context = await d
      .LLMMessageContextService(this.chatId)
      .buildContextWithTrace(TEXT_CONTEXT_SELECTION, {
        beforeMessageId: messageId,
      });
    const messages = [...context.messages];
    const appendedSources: TextAppendedSource[] = [];

    if (hasText(feedback)) {
      messages.push(
        toUserMessage(
          `The previous response was: "${originalContent}"\n\nPlease regenerate with this feedback: ${feedback}`,
        ),
      );
      appendedSources.push("regeneration-feedback");
    }

    return withAppendedSources(context, messages, appendedSources);
  }
}

const withAppendedSources = (
  context: ContextRequest,
  messages: ContextRequest["messages"],
  appendedSources: TextAppendedSource[],
): { messages: ContextRequest["messages"]; trace: TrackedContextTrace } => ({
  messages,
  trace: {
    ...context.trace,
    appendedSources,
  },
});

const resolveReasoningPrompt = (
  chatSettings: ChatSettings,
  systemPrompts: SystemPrompts | undefined,
): string =>
  chatSettings.reasoningPromptOverride?.trim() ||
  systemPrompts?.reasoningPrompt ||
  DEFAULT_SYSTEM_PROMPTS.reasoningPrompt;

const formatGuidanceMessage = (guidance: string): string =>
  `User guidance for the next response: ${guidance}`;

const hasText = (content: string | undefined): content is string =>
  content !== undefined && content.trim().length > 0;
