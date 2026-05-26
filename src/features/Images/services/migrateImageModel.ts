import type { ImageModel } from "./modelGeneration/ImageModel";
import type { ImageGenInput, ImageGenEcosystem } from "./api/ImageGenInput";
import { d } from "../../../services/Dependencies";

/**
 * Detects whether a stored ImageModel uses the legacy FromTextInput format
 * (produced by the civitai SDK — has a nested `params` object).
 */
const isLegacyInput = (input: unknown): boolean =>
  typeof input === "object" &&
  input !== null &&
  "params" in input &&
  typeof (input as any).params === "object";

/**
 * Converts a legacy FromTextInput into the new flat ImageGenInput format.
 * Also handles the sampleImageId → sampleWorkflowId rename.
 */
const migrateInput = (legacyInput: any): ImageGenInput => {
  const params = legacyInput.params ?? {};
  const schedulerName: string = params.scheduler ?? "Euler a";
  const samplerParams = d.SchedulerMapper().MapToSampleMethodParams(schedulerName);

  const airUrn: string = legacyInput.model ?? "";
  const ecosystem = resolveEcosystem(airUrn);

  const loras = migrateLoras(legacyInput.additionalNetworks);

  const input: ImageGenInput = {
    engine: "sdcpp",
    ecosystem,
    operation: "createImage",
    model: airUrn,
    prompt: params.prompt ?? "",
    negativePrompt: params.negativePrompt,
    sampleMethod: samplerParams.sampleMethod,
    schedule: samplerParams.schedule,
    steps: params.steps,
    cfgScale: params.cfgScale,
    width: params.width ?? 512,
    height: params.height ?? 512,
    loras,
  };

  if (ecosystem === "sd1") {
    input.clipSkip = params.clipSkip ?? 2;
  }

  return input;
};

/**
 * Converts legacy additionalNetworks (Record<string, {strength: number}>)
 * to new loras format (Record<string, number>).
 */
const migrateLoras = (
  additionalNetworks: Record<string, { strength: number }> | undefined,
): Record<string, number> | undefined => {
  if (!additionalNetworks) return undefined;
  return Object.fromEntries(
    Object.entries(additionalNetworks).map(([air, { strength }]) => [air, strength]),
  );
};

const resolveEcosystem = (airUrn: string): ImageGenEcosystem => {
  if (airUrn.startsWith("urn:air:anima:")) return "anima";
  if (airUrn.startsWith("urn:air:sd1:")) return "sd1";
  return "sdxl";
};

/**
 * Applies a read-time migration to a stored ImageModel.
 * If the model uses the old `FromTextInput` format, transparently upgrades it.
 * Also renames `sampleImageId` → `sampleWorkflowId` if present.
 */
export const migrateImageModel = (model: any): ImageModel => {
  const migratedInput = isLegacyInput(model.input)
    ? migrateInput(model.input)
    : model.input;

  const migratedSampleId =
    model.sampleWorkflowId ?? model.sampleImageId ?? undefined;

  return {
    ...model,
    input: migratedInput,
    sampleWorkflowId: migratedSampleId,
    sampleImageId: undefined,
  };
};
