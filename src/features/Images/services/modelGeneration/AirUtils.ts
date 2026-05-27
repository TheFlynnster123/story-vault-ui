export interface AirIdentifier {
  ecosystem?: string;
  type?: string;
  source: string;
  id: string;
  version?: string;
  fileId?: string;
  format?: string;
}

const AIR_PATTERN =
  /^(?:urn:)?(?:air:)?(?:(?<ecosystem>[a-zA-Z0-9_\-/]+):)?(?:(?<type>[a-zA-Z0-9_\-/]+):)?(?<source>[a-zA-Z0-9_\-/]+):(?<id>[a-zA-Z0-9_\-/.]+)(?:@(?<version>[a-zA-Z0-9_\-/.=,%]+))?(?:\+(?<fileId>[a-zA-Z0-9_\-/.=,%]+))?(?:\.(?<format>[a-zA-Z0-9_-]+))?$/;

/**
 * Parses CivitAI's documented AIR format:
 * urn:air:{ecosystem}:{type}:{source}:{id}[@{version}][+{fileId}][.{format}]
 */
export const parseAir = (air: string): AirIdentifier | undefined => {
  const match = air.match(AIR_PATTERN);
  if (!match?.groups) return undefined;

  return {
    ecosystem: match.groups.ecosystem,
    type: match.groups.type,
    source: match.groups.source,
    id: match.groups.id,
    version: match.groups.version,
    fileId: match.groups.fileId,
    format: match.groups.format,
  };
};

export const extractModelIdFromAir = (air: string): number | undefined => {
  const parsed = parseAir(air);
  if (parsed?.source !== "civitai") return undefined;

  const modelId = Number(parsed.id);
  return Number.isFinite(modelId) ? modelId : undefined;
};
