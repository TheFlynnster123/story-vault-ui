import { d } from "../../../services/Dependencies";
import type { ImageGenEcosystem, ImageGenInput } from "./api/ImageGenInput";
import type {
  AnyImageModel,
  ImageModel,
  LegacyJobImageModel,
} from "./modelGeneration/ImageModel";

const LEGACY_REASON =
  "This model was saved with the previous image model format and must be migrated before it can be edited or used for new generation.";

export class LegacyImageModelWorkflowConverter {
  classify(model: any): AnyImageModel {
    if (model?.format === "workflow") {
      const { sampleImageId, ...modelFields } = model;
      const sampleWorkflowId = model.sampleWorkflowId ?? model.sampleImageId;
      return {
        ...modelFields,
        format: "workflow",
        ...(sampleWorkflowId ? { sampleWorkflowId } : {}),
      };
    }

    if (this.isLegacyInput(model?.input)) {
      return {
        ...model,
        format: "legacy-job",
        sampleWorkflowId: model.sampleWorkflowId ?? model.sampleImageId,
        legacyReason: LEGACY_REASON,
      };
    }

    const { sampleImageId, ...modelFields } = model;

    const sampleWorkflowId = model?.sampleWorkflowId ?? model?.sampleImageId;
    return {
      ...modelFields,
      format: "legacy-job",
      ...(sampleWorkflowId ? { sampleWorkflowId } : {}),
      legacyReason: LEGACY_REASON,
    };
  }

  canConvert(model: AnyImageModel): model is LegacyJobImageModel {
    return model.format === "legacy-job" && this.isLegacyInput(model.input);
  }

  convert(model: AnyImageModel): ImageModel {
    if (model.format !== "legacy-job") {
      return {
        ...model,
        format: "workflow",
        sampleWorkflowId: model.sampleWorkflowId,
      };
    }

    const {
      sampleImageId,
      legacyReason,
      input: _legacyInput,
      ...modelFields
    } = model;

    return {
      ...modelFields,
      format: "workflow",
      input: this.isLegacyInput(model.input)
        ? this.convertInput(model.input)
        : (model.input as ImageGenInput),
      sampleWorkflowId: model.sampleWorkflowId ?? model.sampleImageId,
    };
  }

  private isLegacyInput(input: unknown): boolean {
    return (
      typeof input === "object" &&
      input !== null &&
      "params" in input &&
      typeof (input as any).params === "object"
    );
  }

  private convertInput(legacyInput: any): ImageGenInput {
    const params = legacyInput.params ?? {};
    const schedulerName: string = params.scheduler ?? "Euler a";
    const samplerParams =
      d.SchedulerMapper().MapToSampleMethodParams(schedulerName);

    const airUrn: string = legacyInput.model ?? "";
    const ecosystem = this.resolveEcosystem(airUrn);
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
      loras: this.convertLoras(legacyInput.additionalNetworks),
    };

    if (ecosystem === "sd1") {
      input.clipSkip = params.clipSkip ?? 2;
    }

    return input;
  }

  private convertLoras(
    additionalNetworks: Record<string, { strength: number }> | undefined,
  ): Record<string, number> | undefined {
    if (!additionalNetworks) return undefined;
    return Object.fromEntries(
      Object.entries(additionalNetworks).map(([air, { strength }]) => [
        air,
        strength,
      ]),
    );
  }

  private resolveEcosystem(airUrn: string): ImageGenEcosystem {
    if (airUrn.startsWith("urn:air:anima:")) return "anima";
    if (airUrn.startsWith("urn:air:sd1:")) return "sd1";
    return "sdxl";
  }
}

export const imageModelWorkflowConverter =
  new LegacyImageModelWorkflowConverter();
