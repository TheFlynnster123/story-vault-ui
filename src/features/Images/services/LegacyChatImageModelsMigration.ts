import { d } from "../../../services/Dependencies";
import { imageModelWorkflowConverter } from "./LegacyImageModelWorkflowConverter";
import type { ChatImageVariants } from "./ChatImageVariantsManagedBlob";
import type { ImageModelVariant } from "./ImageModelVariant";
import type { AnyImageModel, ImageModel } from "./modelGeneration/ImageModel";
import { isWorkflowImageModel } from "./modelGeneration/ImageModel";

export class LegacyChatImageModelsMigration {
  private readonly chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  async migrate(): Promise<ChatImageVariants> {
    const empty = createEmpty();
    const legacy = await d.ChatImageModelsManagedBlob(this.chatId).get();
    if (!legacy?.models.length) return empty;

    const systemModels = (
      await d.ImageModelService().GetAllImageModels()
    ).models.filter(isWorkflowImageModel);

    if (systemModels.length === 0) {
      return {
        ...empty,
        legacyMigration: {
          status: "partial",
          message:
            "Older chat image settings could not be migrated because no workflow-compatible system image model is available. Image generation will use the system default.",
        },
      };
    }

    const migrated: Array<{ legacyId: string; variant: ImageModelVariant }> = [];
    let skipped = 0;

    for (const storedModel of legacy.models) {
      try {
        const model = toWorkflowModel(storedModel);
        const exactSystemModel = systemModels.find(
          (candidate) => candidate.id === model.id,
        );
        if (exactSystemModel) continue;

        const parent =
          systemModels.find(
            (candidate) => candidate.input.model === model.input.model,
          ) ?? systemModels[0];
        migrated.push({
          legacyId: model.id,
          variant: toVariant(model, parent),
        });
      } catch (error) {
        skipped++;
        d.ErrorService().log(
          `Could not migrate legacy chat image model ${storedModel?.id ?? "unknown"}`,
          error,
        );
      }
    }

    const selectedSystemModel = systemModels.find(
      (model) => model.id === legacy.selectedModelId,
    );
    const selectedVariant = migrated.find(
      ({ legacyId }) => legacyId === legacy.selectedModelId,
    )?.variant;
    const migratedCount = migrated.length;
    const status = skipped > 0 ? "partial" : "migrated";

    return {
      selectedVariantId: selectedVariant?.id ?? "",
      selectedSystemModelId: selectedVariant
        ? ""
        : (selectedSystemModel?.id ?? ""),
      variants: migrated.map(({ variant }) => variant),
      legacyMigration: {
        status,
        message:
          status === "migrated"
            ? `${migratedCount} older chat image model${migratedCount === 1 ? "" : "s"} migrated to variants.`
            : `${migratedCount} older chat image model${migratedCount === 1 ? "" : "s"} migrated; ${skipped} could not be converted. Image generation will safely fall back to an available system model when needed.`,
      },
    };
  }
}

const toWorkflowModel = (model: AnyImageModel): ImageModel => {
  const classified = imageModelWorkflowConverter.classify(model);
  if (isWorkflowImageModel(classified)) return classified;
  if (!imageModelWorkflowConverter.canConvert(classified)) {
    throw new Error("The stored model format is not convertible.");
  }
  return imageModelWorkflowConverter.convert(classified);
};

const toVariant = (
  model: ImageModel,
  parent: ImageModel,
): ImageModelVariant => ({
  id: `migrated-${model.id}`,
  name: model.name,
  parentModelId: parent.id,
  timestampUtcMs: model.timestampUtcMs ?? Date.now(),
  overrides: {
    input: { ...model.input },
    ...("sampleWorkflowId" in model
      ? { sampleWorkflowId: model.sampleWorkflowId }
      : {}),
    ...("imageGenerationPrompt" in model
      ? { imageGenerationPrompt: model.imageGenerationPrompt }
      : {}),
    ...("appendImageGenerationPromptToBase" in model
      ? {
          appendImageGenerationPromptToBase:
            model.appendImageGenerationPromptToBase,
        }
      : {}),
    ...("trainedWords" in model ? { trainedWords: model.trainedWords } : {}),
    ...("priority" in model ? { priority: model.priority } : {}),
  },
});

const createEmpty = (): ChatImageVariants => ({
  selectedVariantId: "",
  selectedSystemModelId: "",
  variants: [],
});
