import { BlobAPI } from "../../clients/BlobAPI";
import { ErrorService } from "../ErrorHandling/ErrorService";
import { GeneratedImageQuery } from "../ImageModels/GeneratedImageQuery";
import { ImageIdExtractor } from "../ImageModels/ImageIdExtractor";
import { ImageModelFromGeneratedImageService } from "../ImageModels/ImageModelFromGeneratedImageService";
import { ImageModelMapper } from "../ImageModels/ImageModelMapper";
import { ImageModelService } from "../ImageModels/ImageModelService";
import { SchedulerMapper } from "../ImageModels/SchedulerMapper";
import { BaseModelMapper } from "../ImageModels/BaseModelMapper";
import { QUERY_CLIENT } from "../../App";
import { SystemSettingsService } from "../../queries/system-settings/SystemSettingsService";
import { ChatSettingsService } from "../../queries/chat-settings/ChatSettingsService";
import { MemoriesService } from "../../queries/memories/MemoriesService";
import { CivitJobAPI } from "../../clients/CivitJobAPI";
import { GrokChatAPI } from "../../clients/GrokChatAPI";
import {
  PlanService,
  getPlanServiceInstance,
} from "../ChatGeneration/PlanService";
import {
  ChatGeneration,
  getChatGenerationInstance,
} from "../ChatGeneration/ChatGeneration";
import {
  LLMMessageContextService,
  getLLMMessageContextServiceInstance,
} from "../ChatGeneration/LLMMessageContextService";
import { ImageGenerator } from "../../Managers/ImageGenerator";
import {
  UserChatProjection,
  getUserChatProjectionInstance,
} from "../../cqrs/UserChatProjection";
import {
  LLMChatProjection,
  getLLMChatProjectionInstance,
} from "../../cqrs/LLMChatProjection";
import {
  ChatEventService,
  getChatEventServiceInstance,
} from "../../cqrs/ChatEventService";
import { ChatEventStore } from "../../clients/ChatEventStore";
import { ChatService } from "../../cqrs/ChatService";
import { ChatAPI } from "../../clients/ChatAPI";
import {
  RecentChatsService,
  getRecentChatsServiceInstance,
} from "../../services/RecentChatsService";
import { JobStatusService } from "../../services/JobStatusService";
import { PhotoStorageService } from "../../services/PhotoStorageService";
import { getAuthApiSingleton } from "../../clients/AuthAPI";
import { getEncryptionManagerSingleton } from "../../Managers/EncryptionManager";
import { GrokKeyAPI } from "../../clients/GrokKeyAPI";
import { CivitKeyAPI } from "../../clients/CivitKeyAPI";
import { CivitJobOrchestrator } from "../../services/CivitJobOrchestrator";

export class Dependencies {
  CivitKeyAPI() {
    return new CivitKeyAPI();
  }

  CivitJobOrchestrator() {
    return new CivitJobOrchestrator();
  }

  GrokKeyAPI() {
    return new GrokKeyAPI();
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

  JobStatusService() {
    return new JobStatusService();
  }

  ChatAPI() {
    return new ChatAPI();
  }
  ChatEventStore(): ChatEventStore {
    return new ChatEventStore();
  }

  MemoriesService(chatId: string) {
    return new MemoriesService(chatId);
  }
  ImageGenerator() {
    return new ImageGenerator();
  }
  ChatGenerationService(chatId: string) {
    return getChatGenerationInstance(chatId) as ChatGeneration;
  }
  PlanService(chatId: string) {
    return getPlanServiceInstance(chatId) as PlanService;
  }
  LLMMessageContextService(chatId: string) {
    return getLLMMessageContextServiceInstance(
      chatId
    ) as LLMMessageContextService;
  }
  GrokChatAPI() {
    return new GrokChatAPI();
  }
  CivitJobAPI() {
    return new CivitJobAPI();
  }
  SystemSettingsService() {
    return new SystemSettingsService();
  }

  ChatSettingsService(chatId: string) {
    return new ChatSettingsService(chatId);
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
    return getUserChatProjectionInstance(chatId) as UserChatProjection;
  }

  LLMChatProjection(chatId: string) {
    return getLLMChatProjectionInstance(chatId) as LLMChatProjection;
  }

  ChatEventService(chatId: string) {
    return getChatEventServiceInstance(chatId) as ChatEventService;
  }

  ChatService(chatId: string) {
    return new ChatService(chatId);
  }

  RecentChatsService() {
    return getRecentChatsServiceInstance() as RecentChatsService;
  }
}

export const d = new Dependencies();
