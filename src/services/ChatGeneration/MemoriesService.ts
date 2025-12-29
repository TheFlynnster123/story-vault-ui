import { d } from "../Dependencies";
import type { Memory } from "../ChatGeneration/Memory";

export class MemoriesService {
  private chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  Subscribe = (callback: () => void): (() => void) => {
    return d.MemoriesManagedBlob(this.chatId).subscribe(callback);
  };

  Get = async (): Promise<Memory[]> => {
    const data = await d.MemoriesManagedBlob(this.chatId).get();
    return data ?? [];
  };

  Save = async (memories: Memory[]): Promise<void> => {
    await d.MemoriesManagedBlob(this.chatId).save(memories);
  };

  SaveDebounced = async (memories: Memory[]): Promise<void> => {
    await d.MemoriesManagedBlob(this.chatId).saveDebounced(memories);
  };

  SaveMemory = async (memory: Memory): Promise<void> => {
    const memories = await this.Get();
    const existingIndex = memories.findIndex((m) => m.id === memory.id);

    if (existingIndex >= 0) memories[existingIndex] = memory;
    else memories.push(memory);

    await this.SaveDebounced(memories);
  };

  RemoveMemory = async (memoryId: string): Promise<void> => {
    const memories = await this.Get();
    const filtered = memories.filter((m) => m.id !== memoryId);
    await this.SaveDebounced(filtered);
  };
}
