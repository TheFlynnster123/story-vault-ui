import { BlobAPI } from "../../clients/BlobAPI";
import { ErrorService } from "../ErrorHandling/ErrorService";
import { ImageModelService } from "../ImageModels/ImageModelService";
import { SchedulerMapper } from "../ImageModels/SchedulerMapper";

export class Dependencies {
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
}

export const d = new Dependencies();
