import Config from "../../../../services/Config";
import type { Workflow } from "../CivitJob";
import type { ImageGenStep } from "./ImageGenInput";
import { d } from "../../../../services/Dependencies";

/**
 * Frontend client for the CivitAI Orchestration API.
 * All calls are proxied through the backend, which injects the user's CivitAI key.
 */
export class CivitOrchestrationAPI {
  private readonly url: string;

  constructor() {
    this.url = Config.storyVaultAPIURL;
  }

  public async submitWorkflow(steps: ImageGenStep[]): Promise<Workflow> {
    const accessToken = await d.AuthAPI().getAccessToken();
    const encryptionKey = await d.EncryptionManager().getCivitaiEncryptionKey();

    const response = await fetch(`${this.url}/api/SubmitWorkflow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        EncryptionKey: encryptionKey,
      },
      body: JSON.stringify({ steps }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to submit workflow: ${errorBody}`);
    }

    return response.json();
  }

  public async getWorkflow(workflowId: string): Promise<Workflow> {
    const accessToken = await d.AuthAPI().getAccessToken();
    const encryptionKey = await d.EncryptionManager().getCivitaiEncryptionKey();

    const response = await fetch(`${this.url}/api/GetWorkflow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        EncryptionKey: encryptionKey,
      },
      body: JSON.stringify({ workflowId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get workflow: ${response.statusText}`);
    }

    return response.json();
  }
}
