import { ErrorService } from "../ErrorHandling/ErrorService";

export class Dependencies {
  ErrorService() {
    return new ErrorService();
  }
}

export const d = new Dependencies();
