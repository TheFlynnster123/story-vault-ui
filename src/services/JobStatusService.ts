import { CivitJobAPI } from "../clients/CivitJobAPI";
import type { CivitJobStatus } from "../types/CivitJob";

/**
 * Service responsible for checking job status from CivitAI
 */
export class JobStatusService {
  private civitJobAPI: CivitJobAPI;

  constructor() {
    this.civitJobAPI = new CivitJobAPI();
  }

  async getJobStatus(jobId: string): Promise<CivitJobStatus> {
    try {
      const response = await this.civitJobAPI.getJobStatus(jobId);

      return {
        scheduled: response.scheduled,
        result: response.result || [],
      };
    } catch (error) {
      return {
        scheduled: false,
        result: [],
      };
    }
  }
}
