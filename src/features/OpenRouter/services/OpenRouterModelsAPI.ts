const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

const isTextModel = (model: OpenRouterModel): boolean =>
  !model.id.includes("vision") || model.id.includes("chat");

export class OpenRouterModelsAPI {
  async getModels(): Promise<OpenRouterModel[]> {
    const response = await fetch(OPENROUTER_MODELS_URL);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch OpenRouter models: ${response.status} ${response.statusText}`,
      );
    }

    const json: OpenRouterModelsResponse = await response.json();

    return json.data.filter(isTextModel);
  }
}
