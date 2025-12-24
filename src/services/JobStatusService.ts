import { d } from "../app/Dependencies/Dependencies";
import type { CivitJobStatus } from "../types/CivitJob";

/**
 * Service responsible for checking job status from CivitAI
 */
export class JobStatusService {
  async getJobStatus(jobId: string): Promise<CivitJobStatus> {
    try {
      const response = await d.CivitJobAPI().getJobStatus(jobId);

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
