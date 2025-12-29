import { BlobAPI } from "./Blob/BlobAPI";
import { getChatSettingsManagedBlobInstance } from "./Blob/ChatSettingsManagedBlob";
import { getImageModelsManagedBlobInstance } from "./Blob/ImageModelsManagedBlob";
import { getMemoriesManagedBlobInstance } from "./Blob/MemoriesManagedBlob";
import { getPlansManagedBlobInstance } from "./Blob/PlansManagedBlob";
import { getRecentChatsManagedBlobInstance } from "./Blob/RecentChatsManagedBlob";
import { getSystemSettingsManagedBlobInstance } from "./Blob/SystemSettingsManagedBlob";
import { ErrorService } from "../components/Common/ErrorService";
import { QUERY_CLIENT } from "../App";
import { SystemSettingsService } from "./System/SystemSettingsService";
import { getChatSettingsServiceInstance } from "./Chat/ChatSettingsService";
import { GrokChatAPI } from "./Grok/GrokChatAPI";
import {
  PlanService,
  getPlanServiceInstance,
} from "./ChatGeneration/PlanService";
import {
  ChatGeneration,
  getChatGenerationInstance,
} from "./ChatGeneration/ChatGeneration";
import {
  LLMMessageContextService,
  getLLMMessageContextServiceInstance,
} from "./ChatGeneration/LLMMessageContextService";
import { ImageGenerator } from "./Image/ImageGenerator";
import {
  UserChatProjection,
  getUserChatProjectionInstance,
} from "./CQRS/UserChatProjection";
import {
  LLMChatProjection,
  getLLMChatProjectionInstance,
} from "./CQRS/LLMChatProjection";
import {
  ChatEventService,
  getChatEventServiceInstance,
} from "./CQRS/ChatEventService";
import {
  RecentChatsService,
  getRecentChatsServiceInstance,
} from "./Chat/RecentChatsService";
import { PhotoStorageService } from "./Image/PhotoStorageService";
import { getAuthApiSingleton } from "./Auth/AuthAPI";
import { getEncryptionManagerSingleton } from "./Auth/EncryptionManager";
import { GrokKeyAPI } from "./Grok/GrokKeyAPI";
import { CivitJobOrchestrator } from "./Image/CivitJobOrchestrator";
import { ImageModelFromGeneratedImageService } from "./Image/modelGeneration/ImageModelFromGeneratedImageService";
import { ImageModelService } from "./Image/modelGeneration/ImageModelService";
import { GeneratedImageQuery } from "./Image/modelGeneration/GeneratedImageQuery";
import { ImageIdExtractor } from "./Image/modelGeneration/ImageIdExtractor";
import { ImageModelMapper } from "./Image/modelGeneration/ImageModelMapper";
import { BaseModelMapper } from "./Image/modelGeneration/BaseModelMapper";
import { SchedulerMapper } from "./Image/modelGeneration/SchedulerMapper";
import { CivitKeyAPI } from "./Image/api/CivitKeyAPI";
import { CivitJobAPI } from "./Image/api/CivitJobAPI";
import { ChatEventStore } from "./CQRS/ChatEventStore";
import { ChatService } from "./CQRS/ChatService";
import { ChatAPI } from "./Chat/ChatAPI";
import { MemoriesService } from "./ChatGeneration/MemoriesService";

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

  ChatAPI() {
    return new ChatAPI();
  }
  ChatEventStore() {
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

  PlansManagedBlob(chatId: string) {
    return getPlansManagedBlobInstance(chatId);
  }

  RecentChatsManagedBlob() {
    return getRecentChatsManagedBlobInstance();
  }

  SystemSettingsManagedBlob() {
    return getSystemSettingsManagedBlobInstance();
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
