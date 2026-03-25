/**
 * Extracts the CivitAI model ID from an AIR string.
 * AIR format: urn:air:{baseModel}:{type}:civitai:{modelId}@{versionId}
 *
 * @example extractModelIdFromAir("urn:air:sdxl:checkpoint:civitai:123456@789012") => 123456
 */
export const extractModelIdFromAir = (air: string): number | undefined => {
  const match = air.match(/:civitai:(\d+)@/);
  return match ? Number(match[1]) : undefined;
};
