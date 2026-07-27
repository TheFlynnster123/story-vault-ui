import { d } from "../../../services/Dependencies";
import {
  createContinuityHistory,
  createDefaultContinuityHistoryStore,
  normalizeContinuityHistoryStore,
  normalizeRoutingHints,
  type ContinuityHistory,
  type ContinuityHistoryRevision,
  type ContinuityHistorySettings,
  type ContinuityHistoryStore,
} from "./ContinuityHistory";

export class ContinuityHistoriesService {
  private readonly chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  subscribe = (callback: () => void): (() => void) =>
    this.blob().subscribe(callback);

  get = async (): Promise<ContinuityHistoryStore> =>
    normalizeContinuityHistoryStore(await this.blob().get());

  getCached = (): ContinuityHistoryStore =>
    normalizeContinuityHistoryStore(this.blob().getCached());

  save = async (store: ContinuityHistoryStore): Promise<void> =>
    this.blob().save(normalizeContinuityHistoryStore(store));

  saveDebounced = (store: ContinuityHistoryStore): void =>
    this.blob().saveDebounced(normalizeContinuityHistoryStore(store));

  savePendingChanges = (): Promise<void> => this.blob().savePendingChanges();

  async updateSettings(
    updates: Partial<ContinuityHistorySettings>,
  ): Promise<void> {
    const store = await this.get();
    await this.save({
      ...store,
      settings: {
        ...store.settings,
        ...updates,
      },
    });
  }

  async addHistory(history = createContinuityHistory()): Promise<void> {
    const store = await this.get();
    await this.save({
      ...store,
      histories: [...store.histories, history],
    });
  }

  async updateHistory(
    historyId: string,
    updates: Partial<
      Pick<
        ContinuityHistory,
        "title" | "description" | "kind" | "routingHints" | "inclusion"
      >
    >,
  ): Promise<void> {
    const store = await this.get();
    const now = new Date().toISOString();
    await this.save({
      ...store,
      histories: store.histories.map((history) =>
        history.id === historyId
          ? {
              ...history,
              ...updates,
              routingHints:
                updates.routingHints === undefined
                  ? history.routingHints
                  : normalizeRoutingHints(updates.routingHints),
              updatedAt: now,
            }
          : history,
      ),
    });
  }

  async removeHistory(historyId: string): Promise<void> {
    const store = await this.get();
    await this.save({
      ...store,
      histories: store.histories.filter(
        (history) => history.id !== historyId,
      ),
    });
  }

  async addRevision(
    historyId: string,
    revision: ContinuityHistoryRevision,
  ): Promise<void> {
    const store = await this.get();
    await this.save(
      addRevisionToStore(store, historyId, revision),
    );
  }

  async saveManualRevision(
    historyId: string,
    content: string,
    coveredThroughMessageId?: string,
  ): Promise<void> {
    const normalizedContent = content.trim();
    if (!normalizedContent) return;

    await this.addRevision(historyId, {
      id: crypto.randomUUID(),
      content: normalizedContent,
      sourceMessageIds: [],
      coveredThroughMessageId,
      createdAt: new Date().toISOString(),
      origin: "manual",
    });
  }

  private blob = () => d.ContinuityHistoriesManagedBlob(this.chatId);
}

export const addRevisionToStore = (
  store: ContinuityHistoryStore,
  historyId: string,
  revision: ContinuityHistoryRevision,
): ContinuityHistoryStore => ({
  ...store,
  histories: store.histories.map((history) =>
    history.id === historyId
      ? {
          ...history,
          revisions: [...history.revisions, revision],
          updatedAt: revision.createdAt,
        }
      : history,
  ),
});

export const createEmptyHistoryStoreIfNeeded = (
  store: ContinuityHistoryStore | undefined,
): ContinuityHistoryStore =>
  store
    ? normalizeContinuityHistoryStore(store)
    : createDefaultContinuityHistoryStore();
