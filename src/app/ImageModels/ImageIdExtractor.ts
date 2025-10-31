export class ImageIdExtractor {
  public extract(imageIdOrUrl: string): string | undefined {
    const trimmed = imageIdOrUrl.trim();

    if (this.isNumericId(trimmed)) return trimmed;

    try {
      const url = new URL(trimmed);

      const queryId = this.extractIdFromQueryParam(url);
      if (queryId) return queryId;

      const pathId = this.extractIdFromPath(url);
      if (pathId) return pathId;
    } catch {
      return undefined;
    }
  }

  /** Checks if the input string is already a numeric ID */
  isNumericId = (input: string): boolean => {
    return /^\d+$/.test(input);
  };

  /**
   * Extracts the image ID from the URL query parameter
   * @example: For URL "https://civitai.com/api/generation/data?type=image&id=12345678"
   */
  extractIdFromQueryParam = (url: URL): string | null => {
    const id = url.searchParams.get("id");
    return id && this.isNumericId(id) ? id : null;
  };

  /**
   * Extracts the image ID from the URL path
   * @example: For URL "https://civitai.com/images/12345678"
   */
  extractIdFromPath = (url: URL): string | undefined => {
    const pathSegments = url.pathname.split("/");
    const lastSegment = pathSegments[pathSegments.length - 1];
    return this.isNumericId(lastSegment) ? lastSegment : undefined;
  };
}
