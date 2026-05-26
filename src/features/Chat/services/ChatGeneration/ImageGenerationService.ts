import { d } from "../../../../services/Dependencies";
import { GenerationOrchestrator } from "./GenerationOrchestrator";
import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";
import type { CharacterContext } from "../../../Images/services/ImageGenerator";
import type { CivitJobChatMessage } from "../../../../services/CQRS/UserChatProjection";
import { v4 as uuidv4 } from "uuid";

export const getImageGenerationServiceInstance = createInstanceCache(
  (chatId: string) => new ImageGenerationService(chatId),
);

export type MissingCharacterDescriptionDecision =
  | "generate"
  | "manual"
  | "skip";

export type GenerateImageResult =
  | { type: "started" }
  | { type: "missing-character-description"; characterName: string }
  | { type: "navigate-to-character-descriptions"; characterName: string };

export class ImageGenerationService extends GenerationOrchestrator {
  private chatId: string;
  private activeGenerationIds = new Set<string>();

  public PendingMissingCharacter:
    | { messageId: string; characterName: string }
    | undefined;

  constructor(chatId: string) {
    super();
    this.chatId = chatId;
  }

  async generateImage(): Promise<GenerateImageResult> {
    const messageId = createImageGenerationMessageId();

    await d.ChatService(this.chatId).CreateCivitJob(messageId, "", {
      generationStatus: "determining-character",
    });

    this.startGenerationRunner(messageId);
    return { type: "started" };
  }

  async resolveMissingCharacterDescription(
    characterName: string,
    decision: MissingCharacterDescriptionDecision,
  ): Promise<GenerateImageResult> {
    const pending = this.PendingMissingCharacter;
    this.PendingMissingCharacter = undefined;
    this.notifyGenerationSubscribers();

    if (pending && pending.characterName === characterName) {
      return await this.resolveMissingCharacterForMessage(
        pending.messageId,
        characterName,
        decision,
      );
    }

    const result = await this.orchestrate<GenerateImageResult>(
      async (): Promise<GenerateImageResult> => {
        if (decision === "manual") {
          await this.createBlankCharacterRecord(characterName);
          return {
            type: "navigate-to-character-descriptions",
            characterName,
          };
        }

        if (decision === "skip") {
          await this.createBlankCharacterRecord(characterName);
          await this.runImageGenerationSteps(noCharacterContext());
          return { type: "started" };
        }

        const generatedDescription = await d
          .CharacterDescriptionGenerationService(this.chatId)
          .generateDescription(characterName);

        await this.saveGeneratedCharacterDescription(
          characterName,
          generatedDescription,
        );

        await this.runImageGenerationSteps({
          type: "existing-description",
          characterName,
          description: generatedDescription,
        });

        return { type: "started" };
      },
    );

    return result ?? { type: "started" };
  }

  async resumePendingGenerations(): Promise<void> {
    await d.ChatEventService(this.chatId).Initialize();

    const pendingMessages = d
      .UserChatProjection(this.chatId)
      .GetMessages()
      .filter(isResumableImageGenerationMessage);

    pendingMessages.forEach((message) => this.startGenerationRunner(message.id));
  }

  async regenerateImage(jobId: string, feedback?: string): Promise<void> {
    const message = d.UserChatProjection(this.chatId).GetMessage(jobId);

    if (!message || message.type !== "civit-job") {
      console.warn(`CivitJob with id ${jobId} not found`);
      return;
    }

    await this.orchestrate(async () => {
      const originalPrompt = message.data?.prompt;
      const originalModel = getOriginalModelFromData(message.data);
      const characterName = message.data?.characterName;

      await d.ChatService(this.chatId).DeleteMessage(jobId);

      this.setStatus("Generating image prompt...");
      const messageList = d.LLMChatProjection(this.chatId).GetMessages();

      const characterContext = characterName
        ? await resolveCharacterContextByName(this.chatId, characterName)
        : noCharacterContext();

      const generatedPrompt = await d
        .ImageGenerator(this.chatId)
        .generatePromptWithFeedbackAndCharacterContext(
          messageList,
          characterContext,
          originalPrompt,
          feedback,
        );

      const rawCharacterDescription = getRawDescriptionFromContext(characterContext);

      this.setStatus("Triggering image generation...");
      const { jobId: newJobId, modelName, fullPrompt, basePrompt, sceneDescription } =
        await d
          .ImageGenerator(this.chatId)
          .triggerJob(generatedPrompt, originalModel, rawCharacterDescription);

      this.setStatus("Saving job...");
      await d.ChatService(this.chatId).CreateCivitJob(newJobId, fullPrompt, {
        modelName,
        modelId: originalModel?.id,
        modelSource: originalModel?.source,
        characterName,
        characterDescription: rawCharacterDescription,
        basePrompt,
        sceneDescription,
      });
    });
  }

  private async runImageGenerationSteps(
    characterContext: CharacterContext,
    messageId?: string,
  ): Promise<void> {
    this.setStatus("Generating image prompt...");
    const messageList = d.LLMChatProjection(this.chatId).GetMessages();
    const preferredImage =
      await this.resolveCharacterPreferredImage(characterContext);
    const selectedModelName = messageId
      ? await this.resolveSelectedModelName(preferredImage)
      : undefined;

    if (messageId) {
      await d.ChatService(this.chatId).UpdateCivitJob(messageId, {
        generationStatus: "generating-prompt",
        characterName: getNameFromContext(characterContext),
        characterDescription: getRawDescriptionFromContext(characterContext),
        modelName: selectedModelName,
        modelId: preferredImage?.id,
        modelSource: preferredImage?.source,
      });
    }

    const generatedPrompt = await d
      .ImageGenerator(this.chatId)
      .generatePromptWithCharacterContext(messageList, characterContext);

    const rawCharacterDescription = getRawDescriptionFromContext(characterContext);

    if (messageId) {
      await d.ChatService(this.chatId).UpdateCivitJob(messageId, {
        sceneDescription: generatedPrompt,
        generationStatus: "submitting",
      });
    }

    this.setStatus("Triggering image generation...");
    const { jobId, modelName, fullPrompt, basePrompt, sceneDescription } =
      await d
        .ImageGenerator(this.chatId)
        .triggerJob(generatedPrompt, preferredImage, rawCharacterDescription);

    this.setStatus("Saving job...");
    const patch = {
      jobId,
      prompt: fullPrompt,
      modelName,
      modelId: preferredImage?.id,
      modelSource: preferredImage?.source,
      characterDescription: rawCharacterDescription,
      characterName: getNameFromContext(characterContext),
      basePrompt,
      sceneDescription,
      generationStatus: "submitted" as const,
    };

    if (messageId) {
      await d.ChatService(this.chatId).UpdateCivitJob(messageId, patch);
    } else {
      await d.ChatService(this.chatId).CreateCivitJob(jobId, fullPrompt, patch);
    }
  }

  private startGenerationRunner(messageId: string): void {
    void this.continueGeneration(messageId).catch((error) => {
      d.ErrorService().log("Failed to continue image generation", error);
    });
  }

  private async continueGeneration(messageId: string): Promise<void> {
    if (this.activeGenerationIds.has(messageId)) return;
    if (!this.acquireGenerationLease(messageId)) return;

    this.activeGenerationIds.add(messageId);

    try {
      await this.resumeGenerationFromCurrentState(messageId);
    } catch (error) {
      await d.ChatService(this.chatId).UpdateCivitJob(messageId, {
        generationStatus: "failed",
        generationError:
          error instanceof Error ? error.message : "Image generation failed.",
      });
      throw error;
    } finally {
      this.activeGenerationIds.delete(messageId);
      this.releaseGenerationLease(messageId);
    }
  }

  private async resumeGenerationFromCurrentState(
    messageId: string,
  ): Promise<void> {
    const message = this.getImageGenerationMessage(messageId);
    if (!message) return;

    const status = message.data.generationStatus;

    if (status === "submitted" || status === "failed") return;

    if (status === "missing-character-description") {
      this.PendingMissingCharacter = message.data.characterName
        ? { messageId, characterName: message.data.characterName }
        : undefined;
      this.notifyGenerationSubscribers();
      return;
    }

    if (message.data.sceneDescription) {
      await this.submitGeneratedPrompt(message);
      return;
    }

    if (message.data.characterName || message.data.characterDescription) {
      await this.generatePromptForExistingMessage(message);
      return;
    }

    await this.resolveCharacterForMessage(messageId);
  }

  private async resolveCharacterForMessage(messageId: string): Promise<void> {
    await d.ChatService(this.chatId).UpdateCivitJob(messageId, {
      generationStatus: "determining-character",
    });

    const characterContext = await d
      .ImageGenerator(this.chatId)
      .resolveCharacterContext();

    if (isMissingCharacterDescription(characterContext)) {
      this.PendingMissingCharacter = {
        messageId,
        characterName: characterContext.characterName,
      };
      await d.ChatService(this.chatId).UpdateCivitJob(messageId, {
        generationStatus: "missing-character-description",
        characterName: characterContext.characterName,
      });
      this.notifyGenerationSubscribers();
      return;
    }

    await this.runImageGenerationSteps(characterContext, messageId);
  }

  private async resolveMissingCharacterForMessage(
    messageId: string,
    characterName: string,
    decision: MissingCharacterDescriptionDecision,
  ): Promise<GenerateImageResult> {
    if (decision === "manual") {
      await this.createBlankCharacterRecord(characterName);
      return {
        type: "navigate-to-character-descriptions",
        characterName,
      };
    }

    if (decision === "skip") {
      await this.createBlankCharacterRecord(characterName);
      await this.runImageGenerationSteps(noCharacterContext(), messageId);
      return { type: "started" };
    }

    const generatedDescription = await d
      .CharacterDescriptionGenerationService(this.chatId)
      .generateDescription(characterName);

    await this.saveGeneratedCharacterDescription(
      characterName,
      generatedDescription,
    );

    await this.runImageGenerationSteps(
      {
        type: "existing-description",
        characterName,
        description: generatedDescription,
      },
      messageId,
    );

    return { type: "started" };
  }

  private async generatePromptForExistingMessage(
    message: CivitJobChatMessage,
  ): Promise<void> {
    const characterContext = message.data.characterName
      ? await resolveCharacterContextByName(this.chatId, message.data.characterName)
      : noCharacterContext();

    await this.runImageGenerationSteps(characterContext, message.id);
  }

  private async submitGeneratedPrompt(
    message: CivitJobChatMessage,
  ): Promise<void> {
    await d.ChatService(this.chatId).UpdateCivitJob(message.id, {
      generationStatus: "submitting",
    });

    const preferredImage =
      getOriginalModelFromData(message.data) ??
      (message.data.characterName
        ? await this.resolveCharacterPreferredImage({
          type: "existing-description",
          characterName: message.data.characterName,
          description: message.data.characterDescription ?? "",
        })
        : undefined);

    const rawCharacterDescription = message.data.characterDescription;
    const generatedPrompt = message.data.sceneDescription ?? "";

    const { jobId, modelName, fullPrompt, basePrompt, sceneDescription } =
      await d
        .ImageGenerator(this.chatId)
        .triggerJob(generatedPrompt, preferredImage, rawCharacterDescription);

    await d.ChatService(this.chatId).UpdateCivitJob(message.id, {
      jobId,
      prompt: fullPrompt,
      modelName,
      modelId: preferredImage?.id,
      modelSource: preferredImage?.source,
      characterDescription: rawCharacterDescription,
      characterName: message.data.characterName,
      basePrompt,
      sceneDescription,
      generationStatus: "submitted",
    });
  }

  private getImageGenerationMessage(
    messageId: string,
  ): CivitJobChatMessage | undefined {
    const message = d.UserChatProjection(this.chatId).GetMessage(messageId);
    if (!message || message.type !== "civit-job") return undefined;
    return message as CivitJobChatMessage;
  }

  private acquireGenerationLease(messageId: string): boolean {
    if (typeof localStorage === "undefined") return true;

    const key = this.getGenerationLeaseKey(messageId);
    const now = Date.now();
    const existing = Number(localStorage.getItem(key) ?? "0");

    if (existing > now) return false;

    localStorage.setItem(key, String(now + GENERATION_LEASE_TTL_MS));
    return true;
  }

  private releaseGenerationLease(messageId: string): void {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(this.getGenerationLeaseKey(messageId));
  }

  private getGenerationLeaseKey(messageId: string): string {
    return `story-vault:image-generation-lease:${this.chatId}:${messageId}`;
  }

  private notifyGenerationSubscribers(): void {
    this.setStatus(this.Status);
  }

  private async resolveCharacterPreferredImage(
    characterContext: CharacterContext,
  ): Promise<{ id: string; source: "system" | "variant" } | undefined> {
    const characterName = getNameFromContext(characterContext);
    if (!characterName) return undefined;
    const character = await d
      .CharacterDescriptionsService(this.chatId)
      .findByName(characterName);
    return character?.preferredImage;
  }

  private async resolveSelectedModelName(
    preferredImage?: { id: string; source: "system" | "variant" },
  ): Promise<string | undefined> {
    if (!preferredImage) {
      return (await d
        .ChatImageVariantService(this.chatId)
        .getSelectedModelOrDefault()).name;
    }

    if (preferredImage.source === "system") {
      const models = await d.ImageModelService().GetAllImageModels();
      return models.models.find((model) => model.id === preferredImage.id)?.name;
    }

    const variants = await d.ChatImageVariantService(this.chatId).GetAll();
    return variants.variants.find((variant) => variant.id === preferredImage.id)
      ?.name;
  }

  private createBlankCharacterRecord = async (
    characterName: string,
  ): Promise<void> => {
    await d
      .CharacterDescriptionsService(this.chatId)
      .createBlankCharacter(characterName);
  };

  private saveGeneratedCharacterDescription = async (
    characterName: string,
    description: string,
  ): Promise<void> => {
    const characterService = d.CharacterDescriptionsService(this.chatId);
    const character =
      await characterService.createBlankCharacter(characterName);
    await characterService.updateCharacter(character.id, { description });
  };
}

const isMissingCharacterDescription = (
  context: CharacterContext,
): context is { type: "missing-description"; characterName: string } =>
  context.type === "missing-description";

const GENERATION_LEASE_TTL_MS = 2 * 60 * 1000;

const createImageGenerationMessageId = (): string => `image-gen-${uuidv4()}`;

const isResumableImageGenerationMessage = (
  message: unknown,
): message is CivitJobChatMessage => {
  if (!message || typeof message !== "object") return false;

  const candidate = message as CivitJobChatMessage;
  if (candidate.type !== "civit-job") return false;

  return [
    "determining-character",
    "missing-character-description",
    "generating-prompt",
    "submitting",
  ].includes(candidate.data?.generationStatus ?? "");
};

const noCharacterContext = (): CharacterContext => ({ type: "none" });

const getNameFromContext = (context: CharacterContext): string | undefined =>
  context.type === "existing-description" ? context.characterName : undefined;

const getRawDescriptionFromContext = (
  context: CharacterContext,
): string | undefined =>
  context.type === "existing-description" ? context.description : undefined;

const resolveCharacterContextByName = async (
  chatId: string,
  characterName: string,
): Promise<CharacterContext> => {
  const character = await d
    .CharacterDescriptionsService(chatId)
    .findByName(characterName);

  if (!character || !character.description?.trim()) {
    return noCharacterContext();
  }

  return {
    type: "existing-description",
    characterName,
    description: character.description,
  };
};

const getOriginalModelFromData = (
  data: any,
): { id: string; source: "system" | "variant" } | undefined => {
  if (!data?.modelId || !data?.modelSource) return undefined;
  return { id: data.modelId, source: data.modelSource };
};
