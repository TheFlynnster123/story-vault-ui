import type { GeneratedImageResource } from "./GeneratedImage";
import type { ZImageModel } from "../api/ImageGenInput";
import { parseAir } from "./AirUtils";

export type ImageGenerationTarget =
  | { ecosystem: "sdxl" | "sd1"; model: string }
  | { ecosystem: "anima"; diffuserModel?: string }
  | { ecosystem: "zImage"; model: ZImageModel }
  | { ecosystem: "krea2"; model: "krea2" };

export const SUPPORTED_IMPORT_ECOSYSTEMS = [
  "sd1",
  "sdxl",
  "anima",
  "zImage",
  "krea2",
] as const;

type ResolverInput = {
  resources: GeneratedImageResource[];
  resolvedModelAir: string;
  paramsModel?: string;
};

export class ImageModelImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageModelImportError";
  }
}

export const resolveImageGenerationTarget = ({
  resources,
  resolvedModelAir,
  paramsModel,
}: ResolverInput): ImageGenerationTarget => {
  const checkpoint = resources.find(
    (resource) => resource.model.type.toLowerCase() === "checkpoint",
  );
  const evidence = [
    airEcosystem(checkpoint?.air),
    checkpoint?.baseModel,
    ...resources.map((resource) => resource.baseModel),
    paramsModel,
    ...resources.map((resource) => airEcosystem(resource.air)),
    airEcosystem(resolvedModelAir),
  ].filter((value): value is string => !!value);

  for (const value of evidence) {
    const normalized = normalizeFamilyName(value);

    if (isKrea2(normalized)) {
      return { ecosystem: "krea2", model: "krea2" };
    }

    if (isZImage(normalized)) {
      return {
        ecosystem: "zImage",
        model: resolveZImageModel(evidence),
      };
    }

    if (normalized === "anima") {
      return {
        ecosystem: "anima",
        diffuserModel: resolvedModelAir || checkpoint?.air || undefined,
      };
    }

    if (normalized === "sd1" || normalized === "sd15") {
      return { ecosystem: "sd1", model: requireModelAir(resolvedModelAir) };
    }

    if (normalized === "sdxl") {
      return { ecosystem: "sdxl", model: requireModelAir(resolvedModelAir) };
    }
  }

  if (evidence.length > 0) {
    throw new ImageModelImportError(
      `Story Vault does not yet have a generation adapter for the detected model family: ${evidence[0]}.`,
    );
  }

  return { ecosystem: "sdxl", model: requireModelAir(resolvedModelAir) };
};

export const resolveZImageModel = (
  evidence: Array<string | undefined>,
): ZImageModel => {
  for (const value of evidence) {
    const normalized = normalizeFamilyName(value ?? "");
    if (normalized === "base" || normalized.includes("zimagebase")) {
      return "base";
    }
    if (normalized === "turbo" || normalized.includes("zimageturbo")) {
      return "turbo";
    }
  }

  return "turbo";
};

export const isZImageAir = (air: string): boolean =>
  isZImage(normalizeFamilyName(airEcosystem(air) ?? ""));

export const isKrea2Air = (air: string): boolean =>
  isKrea2(normalizeFamilyName(airEcosystem(air) ?? ""));

const airEcosystem = (air: string | undefined): string | undefined =>
  air ? parseAir(air)?.ecosystem : undefined;

const normalizeFamilyName = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const isZImage = (normalized: string): boolean =>
  normalized === "zimage" ||
  normalized.includes("zimagebase") ||
  normalized.includes("zimageturbo");

const isKrea2 = (normalized: string): boolean =>
  normalized === "krea2" || normalized.includes("krea2");

const requireModelAir = (modelAir: string): string => {
  if (modelAir) return modelAir;

  throw new ImageModelImportError(
    "This image does not identify a checkpoint that Story Vault can use for generation.",
  );
};
