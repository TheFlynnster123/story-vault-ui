import { BlobAPI } from "./Blob/BlobAPI";
import { getChatSettingsManagedBlobInstance } from "../features/Chat/services/Chat/ChatSettingsManagedBlob";
import { getChatImageModelsManagedBlobInstance } from "../features/Images/services/ChatImageModelsManagedBlob";
import { getImageModelsManagedBlobInstance } from "../features/Images/services/ImageModelsManagedBlob";
import { getMemoriesManagedBlobInstance } from "../features/Memories/services/MemoriesManagedBlob";
import { getPlansManagedBlobInstance } from "../features/Plans/services/PlansManagedBlob";
import { getRecentChatsManagedBlobInstance } from "../features/Chat/services/Chat/RecentChatsManagedBlob";
import { getSystemSettingsManagedBlobInstance } from "../features/SystemSettings/services/SystemSettingsManagedBlob";
import { getSystemPromptsManagedBlobInstance } from "../features/Prompts/services/SystemPromptsManagedBlob";
import { getChatPromptPresetsManagedBlobInstance } from "../features/Prompts/services/ChatPromptPresetsManagedBlob";
import { getPlanPresetsManagedBlobInstance } from "../features/Plans/services/PlanPresetsManagedBlob";
import { ErrorService } from "./ErrorService";
import { QUERY_CLIENT } from "./QueryClient";
import { SystemSettingsService } from "../features/SystemSettings/services/SystemSettingsService";
import { SystemPromptsService } from "../features/Prompts/services/SystemPromptsService";
import { getChatSettingsServiceInstance } from "../features/Chat/services/Chat/ChatSettingsService";
import { OpenRouterChatAPI } from "../features/OpenRouter/services/OpenRouterChatAPI";
import { getPlanServiceInstance } from "../features/Plans/services/PlanService";
import { getPlanGenerationServiceInstance } from "../features/Plans/services/PlanGenerationService";
import { getTextGenerationServiceInstance } from "../features/Chat/services/ChatGeneration/TextGenerationService";
import { getImageGenerationServiceInstance } from "../features/Chat/services/ChatGeneration/ImageGenerationService";
import { getChapterGenerationServiceInstance } from "../features/Chat/services/ChatGeneration/ChapterGenerationService";
import { getBookGenerationServiceInstance } from "../features/Chat/services/ChatGeneration/BookGenerationService";
import { getLLMMessageContextServiceInstance } from "../features/Chat/services/ChatGeneration/LLMMessageContextService";
import { getAgentFlowServiceInstance } from "../features/Chat/services/AgentFlow/AgentFlowService";
import { ImageGenerator } from "../features/Images/services/ImageGenerator";
import { getChatImageVariantServiceInstance } from "../features/Images/services/ChatImageVariantService";
import { getChatImageVariantsManagedBlobInstance } from "../features/Images/services/ChatImageVariantsManagedBlob";
import { getUserChatProjectionInstance } from "./CQRS/UserChatProjection";
import { getLLMChatProjectionInstance } from "./CQRS/LLMChatProjection";
import { getChatEventServiceInstance } from "./CQRS/ChatEventService";
import { getRecentChatsServiceInstance } from "../features/Chat/services/Chat/RecentChatsService";
import { PhotoStorageService } from "../features/Images/services/PhotoStorageService";
import { getAuthApiSingleton } from "./Auth/AuthAPI";
import { getEncryptionManagerSingleton } from "./Auth/EncryptionManager";
import { OpenRouterKeyAPI } from "../features/OpenRouter/services/OpenRouterKeyAPI";
import { OpenRouterModelsAPI } from "../features/OpenRouter/services/OpenRouterModelsAPI";
import { OpenRouterCreditsAPI } from "../features/OpenRouter/services/OpenRouterCreditsAPI";
import { RecentModelsService } from "../features/AI/services/RecentModelsService";
import { CivitJobOrchestrator } from "../features/Images/services/CivitJobOrchestrator";
import { ImageModelFromGeneratedImageService } from "../features/Images/services/modelGeneration/ImageModelFromGeneratedImageService";
import { ImageModelService } from "../features/Images/services/modelGeneration/ImageModelService";
import { SchedulerMapper } from "../features/Images/services/modelGeneration/SchedulerMapper";
import { CivitKeyAPI } from "../features/Images/services/api/CivitKeyAPI";
import { CivitOrchestrationAPI } from "../features/Images/services/api/CivitOrchestrationAPI";
import { CivitJobAPI } from "../features/Images/services/api/CivitJobAPI";
import { CivitModelInfoQuery } from "../features/Images/services/api/CivitModelInfoQuery";
import { ChatEventStore } from "./CQRS/ChatEventStore";
import { ChatService } from "./CQRS/ChatService";
import { ChatAPI } from "../features/Chat/services/Chat/ChatAPI";
import { MemoriesService } from "../features/Memories/services/MemoriesService";
import { BaseModelMapper } from "../features/Images/services/modelGeneration/BaseModelMapper";
import { GeneratedImageQuery } from "../features/Images/services/modelGeneration/GeneratedImageQuery";
import { ImageIdExtractor } from "../features/Images/services/modelGeneration/ImageIdExtractor";
import { ImageModelMapper } from "../features/Images/services/modelGeneration/ImageModelMapper";
import { getChatInputCacheInstance } from "../features/Chat/services/Chat/ChatInputCache";
import { getCharacterDescriptionsManagedBlobInstance } from "../features/Characters/services/CharacterDescriptionsManagedBlob";
import { CharacterDescriptionsService } from "../features/Characters/services/CharacterDescriptionsService";
import { CharacterSelectionService } from "../features/Characters/services/CharacterSelectionService";
import { CharacterDescriptionGenerationService } from "../features/Characters/services/CharacterDescriptionGenerationService";
import { getCharacterSheetGenerationServiceInstance } from "../features/Characters/services/CharacterSheetGenerationService";
import { getRequestTrackerInstance } from "../features/OpenRouter/services/RequestTracker";
import { ModelPricingEstimator } from "../features/OpenRouter/services/ModelPricingEstimator";
import { getOpenRouterModelsQueryKey } from "../features/OpenRouter/hooks/useOpenRouterModels";
import type { OpenRouterModel } from "../features/OpenRouter/services/OpenRouterModelsAPI";

export class Dependencies {
  CivitKeyAPI() {
    return new CivitKeyAPI();
  }

  CivitJobOrchestrator() {
    return new CivitJobOrchestrator();
  }

  OpenRouterKeyAPI() {
    return new OpenRouterKeyAPI();
  }

  OpenRouterModelsAPI() {
    return new OpenRouterModelsAPI();
  }

  OpenRouterCreditsAPI() {
    return new OpenRouterCreditsAPI();
  }

  RequestTracker() {
    return getRequestTrackerInstance();
  }

  ModelPricingEstimator() {
    return new ModelPricingEstimator(
      () =>
        QUERY_CLIENT.getQueryData<OpenRouterModel[]>(
          getOpenRouterModelsQueryKey(),
        ) ?? [],
    );
  }

  RecentModelsService() {
    return new RecentModelsService();
  }

  EncryptionManager() {
    return getEncryptionManagerSingleton();
  }

  AuthAPI() {
    return getAuthApiSingleton();
  }

  PhotoStorageService() {
    return new PhotoStorageService();
  }

  ChatAPI() {
    return new ChatAPI();
  }
  ChatEventStore() {
    return new ChatEventStore();
  }

  MemoriesService(chatId: string) {
    return new MemoriesService(chatId);
  }
  CharacterDescriptionsService(chatId: string) {
    return new CharacterDescriptionsService(chatId);
  }
  CharacterSelectionService(chatId: string) {
    return new CharacterSelectionService(chatId);
  }
  CharacterDescriptionGenerationService(chatId: string) {
    return new CharacterDescriptionGenerationService(chatId);
  }
  CharacterSheetGenerationService(chatId: string) {
    return getCharacterSheetGenerationServiceInstance(chatId);
  }
  ImageGenerator(chatId: string) {
    return new ImageGenerator(chatId);
  }
  ChatImageModelsManagedBlob(chatId: string) {
    return getChatImageModelsManagedBlobInstance(chatId);
  }
  ChatImageVariantService(chatId: string) {
    return getChatImageVariantServiceInstance(chatId);
  }
  ChatImageVariantsManagedBlob(chatId: string) {
    return getChatImageVariantsManagedBlobInstance(chatId);
  }
  TextGenerationService(chatId: string) {
    return getTextGenerationServiceInstance(chatId);
  }
  ImageGenerationService(chatId: string) {
    return getImageGenerationServiceInstance(chatId);
  }
  ChapterGenerationService(chatId: string) {
    return getChapterGenerationServiceInstance(chatId);
  }
  BookGenerationService(chatId: string) {
    return getBookGenerationServiceInstance(chatId);
  }
  PlanService(chatId: string) {
    return getPlanServiceInstance(chatId);
  }
  PlanGenerationService(chatId: string) {
    return getPlanGenerationServiceInstance(chatId);
  }
  LLMMessageContextService(chatId: string) {
    return getLLMMessageContextServiceInstance(chatId);
  }
  AgentFlowService(chatId: string) {
    return getAgentFlowServiceInstance(chatId);
  }
  OpenRouterChatAPI() {
    return new OpenRouterChatAPI();
  }
  CivitOrchestrationAPI() {
    return new CivitOrchestrationAPI();
  }

  CivitJobAPI() {
    return new CivitJobAPI();
  }

  CivitModelInfoQuery() {
    return new CivitModelInfoQuery();
  }
  SystemSettingsService() {
    return new SystemSettingsService();
  }

  SystemPromptsService() {
    return new SystemPromptsService();
  }

  ChatSettingsService(chatId: string) {
    return getChatSettingsServiceInstance(chatId);
  }

  ChatSettingsManagedBlob(chatId: string) {
    return getChatSettingsManagedBlobInstance(chatId);
  }

  ImageModelsManagedBlob() {
    return getImageModelsManagedBlobInstance();
  }

  MemoriesManagedBlob(chatId: string) {
    return getMemoriesManagedBlobInstance(chatId);
  }

  CharacterDescriptionsManagedBlob(chatId: string) {
    return getCharacterDescriptionsManagedBlobInstance(chatId);
  }

  PlansManagedBlob(chatId: string) {
    return getPlansManagedBlobInstance(chatId);
  }

  RecentChatsManagedBlob() {
    return getRecentChatsManagedBlobInstance();
  }

  SystemSettingsManagedBlob() {
    return getSystemSettingsManagedBlobInstance();
  }

  SystemPromptsManagedBlob() {
    return getSystemPromptsManagedBlobInstance();
  }

  ChatPromptPresetsManagedBlob() {
    return getChatPromptPresetsManagedBlobInstance();
  }

  PlanPresetsManagedBlob() {
    return getPlanPresetsManagedBlobInstance();
  }

  QueryClient() {
    return QUERY_CLIENT;
  }

  ImageModelFromGeneratedImageService() {
    return new ImageModelFromGeneratedImageService();
  }
  ErrorService() {
    return new ErrorService();
  }

  BlobAPI() {
    return new BlobAPI();
  }

  ImageModelService() {
    return new ImageModelService();
  }

  SchedulerMapper() {
    return new SchedulerMapper();
  }

  BaseModelMapper() {
    return new BaseModelMapper();
  }

  GeneratedImageQuery() {
    return new GeneratedImageQuery();
  }

  ImageIdExtractor() {
    return new ImageIdExtractor();
  }

  ImageModelMapper() {
    return new ImageModelMapper();
  }

  UserChatProjection(chatId: string) {
    return getUserChatProjectionInstance(chatId);
  }

  LLMChatProjection(chatId: string) {
    return getLLMChatProjectionInstance(chatId);
  }

  ChatEventService(chatId: string) {
    return getChatEventServiceInstance(chatId);
  }

  ChatService(chatId: string) {
    return new ChatService(chatId);
  }

  ChatInputCache(chatId: string) {
    return getChatInputCacheInstance(chatId);
  }

  RecentChatsService() {
    return getRecentChatsServiceInstance();
  }
}

export const d = new Dependencies();
