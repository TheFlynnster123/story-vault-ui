const STORAGE_KEY = "story-vault-recent-models";
const MAX_RECENT_MODELS = 5;

const loadRecentModels = (): string[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecentModels = (models: string[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
};

export class RecentModelsService {
  getRecentModels(): string[] {
    return loadRecentModels();
  }

  trackModel(modelId: string): void {
    if (!modelId) return;

    const recent = loadRecentModels();
    const withoutDuplicate = recent.filter((id) => id !== modelId);
    const updated = [modelId, ...withoutDuplicate].slice(0, MAX_RECENT_MODELS);
    saveRecentModels(updated);
  }
}
