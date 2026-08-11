import Config from "../../../../services/Config";
import type { Workflow } from "../CivitJob";
import type { ImageGenInput, ImageGenStep } from "./ImageGenInput";
import { d } from "../../../../services/Dependencies";
import { parseAir } from "../modelGeneration/AirUtils";
import {
  isKrea2Air,
  isZImageAir,
  resolveZImageModel,
} from "../modelGeneration/ImageGenerationTargetResolver";

/**
 * Frontend client for the CivitAI Orchestration API.
 * All calls are proxied through the backend, which injects the user's CivitAI key.
 */
export class CivitOrchestrationAPI {
  private readonly url: string;

  constructor() {
    this.url = Config.storyVaultAPIURL;
  }

  public async submitWorkflow(steps: ImageGenStep[]): Promise<Workflow> {
    const accessToken = await d.AuthAPI().getAccessToken();
    const encryptionKey = await d.EncryptionManager().getCivitaiEncryptionKey();
    const normalizedSteps = steps.map(normalizeImageGenStepForSubmission);

    const response = await fetch(`${this.url}/api/SubmitWorkflow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        EncryptionKey: encryptionKey,
      },
      body: JSON.stringify({ steps: normalizedSteps }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to submit workflow: ${errorBody}`);
    }

    return response.json();
  }

  public async getWorkflow(workflowId: string): Promise<Workflow> {
    const accessToken = await d.AuthAPI().getAccessToken();
    const encryptionKey = await d.EncryptionManager().getCivitaiEncryptionKey();

    const response = await fetch(`${this.url}/api/GetWorkflow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        EncryptionKey: encryptionKey,
      },
      body: JSON.stringify({ workflowId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get workflow: ${response.statusText}`);
    }

    return response.json();
  }
}

export const normalizeImageGenStepForSubmission = (
  step: ImageGenStep,
): ImageGenStep => ({
  ...step,
  input: normalizeImageGenInputForSubmission(step.input),
});

export const normalizeImageGenInputForSubmission = (
  input: ImageGenInput,
): ImageGenInput => {
  if (isKrea2Input(input)) return normalizeKrea2Input(input);
  if (isZImageInput(input)) return normalizeZImageInput(input);
  if (!isAnimaInput(input)) return input;

  const normalizedInput: ImageGenInput = { ...input };
  if (normalizedInput.model && !normalizedInput.diffuserModel) {
    normalizedInput.diffuserModel = normalizedInput.model;
  }
  delete normalizedInput.model;
  delete normalizedInput.clipSkip;
  delete normalizedInput.sampler;
  delete normalizedInput.scheduler;

  return {
    ...normalizedInput,
    ecosystem: "anima",
    engine: "sdcpp",
    operation: "createImage",
    sampleMethod: normalizedInput.sampleMethod || "euler",
    schedule: normalizedInput.schedule || "simple",
  };
};

const normalizeKrea2Input = (input: ImageGenInput): ImageGenInput => {
  const normalizedInput: ImageGenInput = { ...input };
  delete normalizedInput.ecosystem;
  delete normalizedInput.diffuserModel;
  delete normalizedInput.negativePrompt;
  delete normalizedInput.width;
  delete normalizedInput.height;
  delete normalizedInput.steps;
  delete normalizedInput.cfgScale;
  delete normalizedInput.sampleMethod;
  delete normalizedInput.schedule;
  delete normalizedInput.sampler;
  delete normalizedInput.scheduler;
  delete normalizedInput.clipSkip;
  delete normalizedInput.loras;

  return {
    ...normalizedInput,
    engine: "fal",
    model: "krea2",
    operation: "createImage",
    size: normalizedInput.size || "medium",
    aspectRatio: normalizedInput.aspectRatio || "1:1",
    creativity: normalizedInput.creativity || "medium",
  };
};

const normalizeZImageInput = (input: ImageGenInput): ImageGenInput => {
  const model = resolveZImageModel([
    input.model,
    ...Object.keys(input.loras ?? {}).filter(isZImageAir),
  ]);
  const normalizedInput: ImageGenInput = { ...input };
  delete normalizedInput.diffuserModel;
  delete normalizedInput.clipSkip;
  delete normalizedInput.sampler;
  delete normalizedInput.scheduler;

  return {
    ...normalizedInput,
    ecosystem: "zImage",
    engine: "sdcpp",
    operation: "createImage",
    model,
    sampleMethod: normalizedInput.sampleMethod || "euler",
    schedule: normalizedInput.schedule || "simple",
    cfgScale: normalizedInput.cfgScale ?? (model === "base" ? 4 : 1),
    steps: normalizedInput.steps ?? (model === "base" ? 20 : 9),
  };
};

const getAirEcosystem = (air: string): string | undefined =>
  parseAir(air)?.ecosystem?.toLowerCase();

const isAnimaInput = (input: ImageGenInput): boolean =>
  input.ecosystem === "anima" ||
  (input.model ? getAirEcosystem(input.model) === "anima" : false) ||
  Object.keys(input.loras ?? {}).some(
    (air) => getAirEcosystem(air) === "anima",
  );

const isZImageInput = (input: ImageGenInput): boolean =>
  input.ecosystem === "zImage" ||
  (input.ecosystem !== "anima" &&
    ((input.model ? isZImageAir(input.model) : false) ||
      Object.keys(input.loras ?? {}).some(isZImageAir)));

const isKrea2Input = (input: ImageGenInput): boolean =>
  input.ecosystem === "krea2" ||
  (input.engine === "fal" && input.model === "krea2") ||
  (input.model ? isKrea2Air(input.model) : false) ||
  Object.keys(input.loras ?? {}).some(isKrea2Air);
