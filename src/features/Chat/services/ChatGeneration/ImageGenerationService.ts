import { d } from "../../../../services/Dependencies";
import { GenerationOrchestrator } from "./GenerationOrchestrator";
import { createInstanceCache } from "../../../../services/Utils/getOrCreateInstance";
import type { CharacterContext } from "../../../Images/services/ImageGenerator";
import type {
  CivitJobChatMessage,
  UserChatMessage,
  CivitWorkflowChatMessage,
} from "../../../../services/CQRS/UserChatProjection";
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
  private leaseOwnerId = createLeaseOwnerId();
  private activeLeaseKeys = new Set<string>();
  private leaseHeartbeatIntervals = new Map<
    string,
    ReturnType<typeof setInterval>
  >();
  private unloadListenerRegistered = false;

  public PendingMissingCharacter:
    | { messageId: string; characterName: string }
    | undefined;

  constructor(chatId: string) {
    super();
    this.chatId = chatId;
    this.registerUnloadLeaseRelease();
  }

  async generateImage(): Promise<GenerateImageResult> {
    const messageId = createImageGenerationMessageId();

    await d.ChatService(this.chatId).CreateCivitWorkflow(messageId, "", {
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

  async regenerateImage(messageId: string, feedback?: string): Promise<void> {
    const message = d.UserChatProjection(this.chatId).GetMessage(messageId);

    if (!message || !isImageWorkflowMessage(message)) {
      console.warn(`Image workflow message with id ${messageId} not found`);
      return;
    }

    await this.orchestrate(async () => {
      const originalPrompt = getImageWorkflowData(message).prompt;
      const originalModel = getOriginalModelFromData(message.data);
      const characterName = getImageWorkflowData(message).characterName;

      await d.ChatService(this.chatId).DeleteMessage(messageId);

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
      const {
        workflowId,
        cost,
        modelName,
        fullPrompt,
        basePrompt,
        sceneDescription,
      } =
        await d
          .ImageGenerator(this.chatId)
          .triggerJob(generatedPrompt, originalModel, rawCharacterDescription);

      this.setStatus("Saving job...");
      await d.ChatService(this.chatId).CreateCivitWorkflow(workflowId, fullPrompt, {
        workflowId,
        ...toCostPatch(cost),
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
      await this.updateImageGenerationMessage(messageId, {
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
      await this.updateImageGenerationMessage(messageId, {
        sceneDescription: generatedPrompt,
        generationStatus: "submitting",
      });
    }

    this.setStatus("Triggering image generation...");
    const {
      workflowId,
      cost,
      modelName,
      fullPrompt,
      basePrompt,
      sceneDescription,
    } =
      await d
        .ImageGenerator(this.chatId)
        .triggerJob(
          generatedPrompt,
          preferredImage,
          rawCharacterDescription,
          async (preparedPrompt) => {
            if (!messageId) return;
            await this.updateImageGenerationMessage(messageId, {
              prompt: preparedPrompt.fullPrompt,
              basePrompt: preparedPrompt.basePrompt,
              sceneDescription: preparedPrompt.sceneDescription,
              modelName: preparedPrompt.modelName,
              generationStatus: "submitting",
            });
          },
        );

    this.setStatus("Saving job...");
    const patch = {
      workflowId,
      ...toCostPatch(cost),
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
      await this.updateImageGenerationMessage(messageId, patch);
    } else {
      await d.ChatService(this.chatId).CreateCivitWorkflow(workflowId, fullPrompt, patch);
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
      await this.updateImageGenerationMessage(messageId, {
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
    await this.updateImageGenerationMessage(messageId, {
      generationStatus: "determining-character",
    });

    const characterContext = await d
      .ImageGenerator(this.chatId)
      .resolveCharacterContext();

    if (isMissingCharacterDescription(characterContext)) {
      const preferredImage = await this.resolveCharacterPreferredImage(
        characterContext,
      );
      const selectedModelName =
        await this.resolveSelectedModelName(preferredImage);
      this.PendingMissingCharacter = {
        messageId,
        characterName: characterContext.characterName,
      };
      await this.updateImageGenerationMessage(messageId, {
        generationStatus: "missing-character-description",
        characterName: characterContext.characterName,
        modelName: selectedModelName,
        modelId: preferredImage?.id,
        modelSource: preferredImage?.source,
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
    message: ImageCivitWorkflowChatMessage,
  ): Promise<void> {
    const data = getImageWorkflowData(message);
    const characterContext = data.characterName
      ? await resolveCharacterContextByName(this.chatId, data.characterName)
      : noCharacterContext();

    await this.runImageGenerationSteps(characterContext, message.id);
  }

  private async submitGeneratedPrompt(
    message: ImageCivitWorkflowChatMessage,
  ): Promise<void> {
    await this.updateImageWorkflowMessage(message.id, message.type, {
      generationStatus: "submitting",
    });

    const data = getImageWorkflowData(message);
    const preferredImage =
      getOriginalModelFromData(message.data) ??
      (data.characterName
        ? await this.resolveCharacterPreferredImage({
          type: "existing-description",
          characterName: data.characterName,
          description: data.characterDescription ?? "",
        })
        : undefined);

    const rawCharacterDescription = data.characterDescription;
    const generatedPrompt = data.sceneDescription ?? "";

    const {
      workflowId,
      cost,
      modelName,
      fullPrompt,
      basePrompt,
      sceneDescription,
    } =
      await d
        .ImageGenerator(this.chatId)
        .triggerJob(
          generatedPrompt,
          preferredImage,
          rawCharacterDescription,
          async (preparedPrompt) => {
            await this.updateImageWorkflowMessage(message.id, message.type, {
              prompt: preparedPrompt.fullPrompt,
              basePrompt: preparedPrompt.basePrompt,
              sceneDescription: preparedPrompt.sceneDescription,
              modelName: preparedPrompt.modelName,
              generationStatus: "submitting",
            });
          },
        );

    await this.updateImageWorkflowMessage(message.id, message.type, {
      workflowId,
      ...toCostPatch(cost),
      prompt: fullPrompt,
      modelName,
      modelId: preferredImage?.id,
      modelSource: preferredImage?.source,
      characterDescription: rawCharacterDescription,
      characterName: data.characterName,
      basePrompt,
      sceneDescription,
      generationStatus: "submitted",
    });
  }

  private getImageGenerationMessage(
    messageId: string,
  ): ImageCivitWorkflowChatMessage | undefined {
    const message = d.UserChatProjection(this.chatId).GetMessage(messageId);
    if (!message || !isImageWorkflowMessage(message)) return undefined;
    return message;
  }

  private async updateImageWorkflowMessage(
    messageId: string,
    messageType: ImageCivitWorkflowChatMessage["type"],
    workflowPatch: ImageWorkflowPatch,
  ): Promise<void> {
    if (messageType === "civit-job") {
      const { workflowId, ...patch } = workflowPatch;
      await d.ChatService(this.chatId).UpdateCivitJob(messageId, {
        ...patch,
        ...(workflowId ? { jobId: workflowId } : {}),
      });
      return;
    }

    await d.ChatService(this.chatId).UpdateCivitWorkflow(messageId, workflowPatch);
  }

  private async updateImageGenerationMessage(
    messageId: string,
    workflowPatch: ImageWorkflowPatch,
  ): Promise<void> {
    const message = this.getImageGenerationMessage(messageId);
    await this.updateImageWorkflowMessage(
      messageId,
      message?.type ?? "civit-workflow",
      workflowPatch,
    );
  }

  private acquireGenerationLease(messageId: string): boolean {
    if (typeof localStorage === "undefined") return true;

    const key = this.getGenerationLeaseKey(messageId);
    const now = Date.now();
    const existing = readGenerationLease(key);

    if (
      existing &&
      existing.ownerId !== this.leaseOwnerId &&
      existing.expiresAt > now &&
      now - existing.updatedAt < STALE_GENERATION_LEASE_MS
    ) {
      return false;
    }

    writeGenerationLease(key, {
      ownerId: this.leaseOwnerId,
      expiresAt: now + GENERATION_LEASE_TTL_MS,
      updatedAt: now,
    });
    this.activeLeaseKeys.add(key);
    this.startLeaseHeartbeat(key);
    return true;
  }

  private releaseGenerationLease(messageId: string): void {
    if (typeof localStorage === "undefined") return;
    const key = this.getGenerationLeaseKey(messageId);
    this.releaseLeaseKey(key);
  }

  private getGenerationLeaseKey(messageId: string): string {
    return `story-vault:image-generation-lease:${this.chatId}:${messageId}`;
  }

  private startLeaseHeartbeat(key: string): void {
    this.stopLeaseHeartbeat(key);

    const interval = setInterval(() => {
      const existing = readGenerationLease(key);
      if (!existing || existing.ownerId !== this.leaseOwnerId) {
        this.stopLeaseHeartbeat(key);
        this.activeLeaseKeys.delete(key);
        return;
      }

      const now = Date.now();
      writeGenerationLease(key, {
        ownerId: this.leaseOwnerId,
        expiresAt: now + GENERATION_LEASE_TTL_MS,
        updatedAt: now,
      });
    }, GENERATION_LEASE_HEARTBEAT_MS);

    this.leaseHeartbeatIntervals.set(key, interval);
  }

  private stopLeaseHeartbeat(key: string): void {
    const interval = this.leaseHeartbeatIntervals.get(key);
    if (!interval) return;

    clearInterval(interval);
    this.leaseHeartbeatIntervals.delete(key);
  }

  private releaseLeaseKey(key: string): void {
    this.stopLeaseHeartbeat(key);
    this.activeLeaseKeys.delete(key);

    const existing = readGenerationLease(key);
    if (!existing || existing.ownerId === this.leaseOwnerId) {
      localStorage.removeItem(key);
    }
  }

  private registerUnloadLeaseRelease(): void {
    if (this.unloadListenerRegistered || typeof window === "undefined") {
      return;
    }

    this.unloadListenerRegistered = true;
    window.addEventListener("pagehide", () => {
      Array.from(this.activeLeaseKeys).forEach((key) =>
        this.releaseLeaseKey(key),
      );
    });
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

type GenerationLease = {
  ownerId: string;
  expiresAt: number;
  updatedAt: number;
};

const GENERATION_LEASE_TTL_MS = 15 * 1000;
const GENERATION_LEASE_HEARTBEAT_MS = 3 * 1000;
const STALE_GENERATION_LEASE_MS = 8 * 1000;

const createLeaseOwnerId = (): string => `image-generation-${uuidv4()}`;

const readGenerationLease = (key: string): GenerationLease | null => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as GenerationLease;
    if (
      !parsed.ownerId ||
      typeof parsed.expiresAt !== "number" ||
      typeof parsed.updatedAt !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    const expiresAt = Number(raw);
    return Number.isFinite(expiresAt)
      ? { ownerId: "legacy", expiresAt, updatedAt: 0 }
      : null;
  }
};

const writeGenerationLease = (key: string, lease: GenerationLease): void => {
  localStorage.setItem(key, JSON.stringify(lease));
};

const createImageGenerationMessageId = (): string => `image-gen-${uuidv4()}`;

type ImageCivitWorkflowChatMessage = CivitJobChatMessage | CivitWorkflowChatMessage;

type ImageWorkflowPatch = Partial<{
  workflowId: string;
  prompt: string;
  modelName: string;
  modelId: string;
  modelSource: "system" | "variant";
  characterDescription: string;
  characterName: string;
  basePrompt: string;
  sceneDescription: string;
  generationStatus:
    | "determining-character"
    | "missing-character-description"
    | "generating-prompt"
    | "submitting"
    | "submitted"
    | "failed";
  generationError: string;
  costAmount: number;
  costCurrency: string;
}>;

const toCostPatch = (
  cost: { amount: number; currency?: string } | undefined,
): Pick<ImageWorkflowPatch, "costAmount" | "costCurrency"> =>
  cost
    ? {
        costAmount: cost.amount,
        costCurrency: cost.currency,
      }
    : {};

const isResumableImageGenerationMessage = (
  message: unknown,
): message is ImageCivitWorkflowChatMessage => {
  if (!message || typeof message !== "object") return false;

  const candidate = message as ImageCivitWorkflowChatMessage;
  if (!isImageWorkflowMessage(candidate)) return false;

  return [
    "determining-character",
    "missing-character-description",
    "generating-prompt",
    "submitting",
  ].includes(candidate.data?.generationStatus ?? "");
};

const isImageWorkflowMessage = (
  message: UserChatMessage,
): message is ImageCivitWorkflowChatMessage =>
  message.type === "civit-job" || message.type === "civit-workflow";

const getImageWorkflowData = (
  message: ImageCivitWorkflowChatMessage,
): ImageCivitWorkflowChatMessage["data"] => message.data;

const noCharacterContext = (): CharacterContext => ({ type: "none" });

const getNameFromContext = (context: CharacterContext): string | undefined =>
  context.type === "existing-description" ||
  context.type === "missing-description"
    ? context.characterName
    : undefined;

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
  data: unknown,
): { id: string; source: "system" | "variant" } | undefined => {
  if (!data || typeof data !== "object") return undefined;
  const candidate = data as {
    modelId?: unknown;
    modelSource?: unknown;
  };
  if (
    typeof candidate.modelId !== "string" ||
    (candidate.modelSource !== "system" && candidate.modelSource !== "variant")
  ) {
    return undefined;
  }
  return { id: candidate.modelId, source: candidate.modelSource };
};
