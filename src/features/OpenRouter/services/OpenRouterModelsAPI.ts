const OPENROUTER_MODELS_URL =
  "https://openrouter.ai/api/v1/models?output_modalities=text";

export interface OpenRouterModelPricing {
  /** Cost per input token in USD */
  prompt?: string;
  /** Cost per output token in USD */
  completion?: string;
  /** Fixed cost per API request in USD */
  request?: string;
  /** Cost per image input in USD */
  image?: string;
  /** Cost per web search operation in USD */
  web_search?: string;
  /** Cost for internal reasoning tokens in USD */
  internal_reasoning?: string;
  /** Cost per cached input token read in USD */
  input_cache_read?: string;
  /** Cost per cached input token write in USD */
  input_cache_write?: string;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: OpenRouterModelPricing;
  supported_parameters?: string[];
}

export interface OpenRouterModelEndpoint {
  name: string;
  provider_name: string;
  tag: string;
  pricing?: OpenRouterModelPricing;
  status?: number;
  uptime_last_5m?: number | null;
  uptime_last_30m?: number | null;
  uptime_last_1d?: number | null;
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

interface OpenRouterModelEndpointsResponse {
  data: {
    endpoints: OpenRouterModelEndpoint[];
  };
}

export class OpenRouterModelsAPI {
  async getModels(): Promise<OpenRouterModel[]> {
    const response = await fetch(OPENROUTER_MODELS_URL);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch OpenRouter models: ${response.status} ${response.statusText}`,
      );
    }

    const json: OpenRouterModelsResponse = await response.json();

    return json.data;
  }

  async getModelEndpoints(modelId: string): Promise<OpenRouterModelEndpoint[]> {
    const [author, ...slugParts] = modelId.split("/");
    const slug = slugParts.join("/");
    if (!author || !slug) {
      throw new Error(`Invalid OpenRouter model ID: ${modelId}`);
    }

    const url = `https://openrouter.ai/api/v1/models/${encodeURIComponent(
      author,
    )}/${encodeURIComponent(slug)}/endpoints`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch OpenRouter model providers: ${response.status} ${response.statusText}`,
      );
    }

    const json: OpenRouterModelEndpointsResponse = await response.json();
    return json.data.endpoints;
  }
}
