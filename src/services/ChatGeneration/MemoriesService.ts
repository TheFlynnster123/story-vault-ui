import { d } from "../Dependencies";
import type { Memory } from "../ChatGeneration/Memory";

export class MemoriesService {
  private chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  subscribe = (callback: () => void): (() => void) => {
    return d.MemoriesManagedBlob(this.chatId).subscribe(callback);
  };

  get = async (): Promise<Memory[]> => {
    const data = await d.MemoriesManagedBlob(this.chatId).get();
    return data ?? [];
  };

  save = async (memories: Memory[]): Promise<void> => {
    await d.MemoriesManagedBlob(this.chatId).save(memories);
  };

  saveDebounced = async (memories: Memory[]): Promise<void> => {
    await d.MemoriesManagedBlob(this.chatId).saveDebounced(memories);
  };

  saveMemory = async (memory: Memory): Promise<void> => {
    const memories = await this.get();
    const existingIndex = memories.findIndex((m) => m.id === memory.id);

    if (existingIndex >= 0) memories[existingIndex] = memory;
    else memories.push(memory);

    await this.saveDebounced(memories);
  };

  removeMemory = async (memoryId: string): Promise<void> => {
    const memories = await this.get();
    const filtered = memories.filter((m) => m.id !== memoryId);
    await this.saveDebounced(filtered);
  };
}
