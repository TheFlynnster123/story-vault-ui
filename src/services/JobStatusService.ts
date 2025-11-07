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
        scheduled: !response.result?.length || !response.result[0]?.available,
        result: response.result || [],
      };
    } catch (error) {
      // If we can't get job status, assume it's no longer scheduled
      return {
        scheduled: false,
        result: [],
      };
    }
  }
}
