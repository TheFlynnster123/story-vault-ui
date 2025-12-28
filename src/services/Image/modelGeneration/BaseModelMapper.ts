export class BaseModelMapper {
  private urns: Record<string, string> = {
    illustrious: "urn:air:sdxl:checkpoint:civitai:795765@889818",
    "sd 1.5": "urn:air:sd1:checkpoint:civitai:4384@128713",
    autismmix_pony: "urn:air:sdxl:checkpoint:civitai:288584@324619",
  };

  public toAIR(baseModel: string) {
    return this.urns[baseModel.toLowerCase()] || "";
  }
}
