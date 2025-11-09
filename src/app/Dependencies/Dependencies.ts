import { BlobAPI } from "../../clients/BlobAPI";
import { ChatHistoryAPI } from "../../clients/ChatHistoryAPI";
import { ErrorService } from "../ErrorHandling/ErrorService";
import { GeneratedImageQuery } from "../ImageModels/GeneratedImageQuery";
import { ImageIdExtractor } from "../ImageModels/ImageIdExtractor";
import { ImageModelFromGeneratedImageService } from "../ImageModels/ImageModelFromGeneratedImageService";
import { ImageModelMapper } from "../ImageModels/ImageModelMapper";
import { ImageModelService } from "../ImageModels/ImageModelService";
import { SchedulerMapper } from "../ImageModels/SchedulerMapper";

export class Dependencies {
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
