import { d } from "../../../../services/Dependencies";
import { GenerationOrchestrator } from "./GenerationOrchestrator";
import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";
import type { CharacterContext } from "../../../Images/services/ImageGenerator";
import { formatCharacterContext } from "../../../Images/services/ImageGenerator";

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

  constructor(chatId: string) {
    super();
    this.chatId = chatId;
  }

  async generateImage(): Promise<GenerateImageResult> {
    const result = await this.orchestrate<GenerateImageResult>(
      async (): Promise<GenerateImageResult> => {
        const characterContext = await d
          .ImageGenerator(this.chatId)
          .resolveCharacterContext();

        if (isMissingCharacterDescription(characterContext)) {
          return {
            type: "missing-character-description",
            characterName: characterContext.characterName,
          };
        }

        await this.runImageGenerationSteps(characterContext);
        return { type: "started" };
      },
    );

    return result ?? { type: "started" };
  }

  async resolveMissingCharacterDescription(
    characterName: string,
    decision: MissingCharacterDescriptionDecision,
  ): Promise<GenerateImageResult> {
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

  async regenerateImage(jobId: string, feedback?: string): Promise<void> {
    const message = d.UserChatProjection(this.chatId).GetMessage(jobId);

    if (!message || message.type !== "civit-job") {
      console.warn(`CivitJob with id ${jobId} not found`);
      return;
    }

    await this.orchestrate(async () => {
      const originalPrompt = message.data?.prompt;
      const originalModel = getOriginalModelFromData(message.data);

      await d.ChatService(this.chatId).DeleteMessage(jobId);

      this.setStatus("Generating image prompt...");
      const messageList = d.LLMChatProjection(this.chatId).GetMessages();
      const generatedPrompt = await d
        .ImageGenerator(this.chatId)
        .generatePromptWithFeedback(messageList, originalPrompt, feedback);

      this.setStatus("Triggering image generation...");
      const { jobId: newJobId, modelName, fullPrompt } = await d
        .ImageGenerator(this.chatId)
        .triggerJob(generatedPrompt, originalModel);

      this.setStatus("Saving job...");
      await d.ChatService(this.chatId).CreateCivitJob(newJobId, fullPrompt, {
        modelName,
        modelId: originalModel?.id,
        modelSource: originalModel?.source,
        characterName: message.data?.characterName,
      });
    });
  }

  private async runImageGenerationSteps(
    characterContext: CharacterContext,
  ): Promise<void> {
    this.setStatus("Generating image prompt...");
    const messageList = d.LLMChatProjection(this.chatId).GetMessages();

    const generatedPrompt = await d
      .ImageGenerator(this.chatId)
      .generatePromptWithCharacterContext(messageList, characterContext);

    const preferredImage =
      await this.resolveCharacterPreferredImage(characterContext);

    this.setStatus("Triggering image generation...");
    const { jobId, modelName, fullPrompt } = await d
      .ImageGenerator(this.chatId)
      .triggerJob(generatedPrompt, preferredImage);

    this.setStatus("Saving job...");
    await d.ChatService(this.chatId).CreateCivitJob(jobId, fullPrompt, {
      modelName,
      modelId: preferredImage?.id,
      modelSource: preferredImage?.source,
      characterDescription: getDescriptionFromContext(characterContext),
      characterName: getNameFromContext(characterContext),
    });
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

const noCharacterContext = (): CharacterContext => ({ type: "none" });

const getNameFromContext = (context: CharacterContext): string | undefined =>
  context.type === "existing-description" ? context.characterName : undefined;

const getDescriptionFromContext = (
  context: CharacterContext,
): string | undefined =>
  context.type === "existing-description"
    ? formatCharacterContext(context.characterName, context.description)
    : undefined;

const getOriginalModelFromData = (
  data: any,
): { id: string; source: "system" | "variant" } | undefined => {
  if (!data?.modelId || !data?.modelSource) return undefined;
  return { id: data.modelId, source: data.modelSource };
};
