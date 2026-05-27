import Config from "../../../../services/Config";
import type { Workflow } from "../CivitJob";
import type { ImageGenInput, ImageGenStep } from "./ImageGenInput";
import { d } from "../../../../services/Dependencies";
import { parseAir } from "../modelGeneration/AirUtils";

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

    const response = await fetch(`${this.url}/api/SubmitWorkflow?wait=60`, {
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

const getAirEcosystem = (air: string): string | undefined =>
  parseAir(air)?.ecosystem?.toLowerCase();

const isAnimaInput = (input: ImageGenInput): boolean =>
  input.ecosystem === "anima" ||
  (input.model ? getAirEcosystem(input.model) === "anima" : false) ||
  Object.keys(input.loras ?? {}).some(
    (air) => getAirEcosystem(air) === "anima",
  );
