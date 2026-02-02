import { d } from "../Dependencies";
import type { SystemPrompts } from "./SystemPrompts";

export class SystemPromptsService {
  Get = async (): Promise<SystemPrompts | undefined> =>
    await d.SystemPromptsManagedBlob().get();

  Save = async (systemPrompts: SystemPrompts): Promise<void> =>
    await d.SystemPromptsManagedBlob().save(systemPrompts);

  SaveDebounced = async (systemPrompts: SystemPrompts): Promise<void> =>
    await d.SystemPromptsManagedBlob().saveDebounced(systemPrompts);

  SavePendingChanges = async (): Promise<void> =>
    await d.SystemPromptsManagedBlob().savePendingChanges();
}
