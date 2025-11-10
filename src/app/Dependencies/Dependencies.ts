import { BlobAPI } from "../../clients/BlobAPI";
import { ChatHistoryAPI } from "../../clients/ChatHistoryAPI";
import { ErrorService } from "../ErrorHandling/ErrorService";
import { GeneratedImageQuery } from "../ImageModels/GeneratedImageQuery";
import { ImageIdExtractor } from "../ImageModels/ImageIdExtractor";
import { ImageModelFromGeneratedImageService } from "../ImageModels/ImageModelFromGeneratedImageService";
import { ImageModelMapper } from "../ImageModels/ImageModelMapper";
import { ImageModelService } from "../ImageModels/ImageModelService";
import { SchedulerMapper } from "../ImageModels/SchedulerMapper";
import { QUERY_CLIENT } from "../../App";
import { SystemSettingsService } from "../../queries/system-settings/SystemSettingsService";
import { ChatSettingsService } from "../../queries/chat-settings/ChatSettingsService";
import { MemoriesService } from "../../queries/memories/MemoriesService";
import { CivitJobAPI } from "../../clients/CivitJobAPI";
import { GrokChatAPI } from "../../clients/GrokChatAPI";
import {
  PlanningNotesService,
  getPlanningNotesCacheInstance,
} from "../ChatGeneration/PlanningNotesService";
import {
  ChatGeneration,
  getChatGenerationInstance,
} from "../ChatGeneration/ChatGeneration";
import {
  ChatCache,
  getChatCacheInstance,
} from "../../queries/chat-cache/ChatCache";
import { ImageGenerator } from "../../Managers/ImageGenerator";

export class Dependencies {
  MemoriesService(chatId: string) {
    return new MemoriesService(chatId);
  }
  ImageGenerator() {
    return new ImageGenerator();
  }
  ChatCache(chatId: string) {
    return getChatCacheInstance(chatId) as ChatCache;
  }
  ChatGenerationService(chatId: string) {
    return getChatGenerationInstance(chatId) as ChatGeneration;
  }
  PlanningNotesService(chatId: string) {
    return getPlanningNotesCacheInstance(chatId) as PlanningNotesService;
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

  GeneratedImageQuery() {
    return new GeneratedImageQuery();
  }

  ImageIdExtractor() {
    return new ImageIdExtractor();
  }

  ImageModelMapper() {
    return new ImageModelMapper();
  }

  _chatHistoryApi: ChatHistoryAPI | undefined;

  ChatHistoryApi() {
    if (!this._chatHistoryApi) this._chatHistoryApi = new ChatHistoryAPI();
    return this._chatHistoryApi;
  }
}

export const d = new Dependencies();
