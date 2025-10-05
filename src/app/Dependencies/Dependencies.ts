import { BlobAPI } from "../../clients/BlobAPI";
import { ErrorService } from "../ErrorHandling/ErrorService";

export class Dependencies {
  ErrorService() {
    return new ErrorService();
  }

  BlobAPI() {
    return new BlobAPI();
  }
}

export const d = new Dependencies();
