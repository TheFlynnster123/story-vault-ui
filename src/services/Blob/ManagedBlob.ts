import { d } from "../Dependencies";

const DEFAULT_DEBOUNCE_MS = 4000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;

export abstract class ManagedBlob<T> {
  protected chatId: string;
  protected data: T | undefined = undefined;
  protected _isLoading: boolean = false;
  protected initialized: boolean = false;

  private subscribers = new Set<() => void>();
  private debounceTimeout: ReturnType<typeof setTimeout> | undefined =
    undefined;
  private fetchPromise: Promise<T | undefined> | null = null;
  private isFetching = false;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  protected abstract getBlobName(): string;

  // Override in subclass to customize debounce timing
  protected getDebounceMs(): number {
    return DEFAULT_DEBOUNCE_MS;
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  public isLoading(): boolean {
    return this._isLoading;
  }

  public get(): Promise<T | undefined> {
    if (this.initialized) return Promise.resolve(this.data);
    if (this.isFetching) return this.fetchPromise!;

    this.isFetching = true;
    this.fetchPromise = this.fetchAndCache().finally(() => {
      this.isFetching = false;
    });

    return this.fetchPromise;
  }

  public async save(data: T): Promise<void> {
    this.clearDebounce();
    this.updateLocalCache(data);
    await this.persistToBlobAPI(data);
  }

  public saveDebounced(data: T): void {
    this.updateLocalCache(data);
    this.scheduleDebounce();
  }

  public async savePendingChanges(): Promise<void> {
    if (!this.hasPendingDebounce()) return;

    this.clearDebounce();

    if (this.data !== undefined) {
      await this.persistToBlobAPI(this.data);
    }
  }

  public async refetch(): Promise<T | undefined> {
    this.initialized = false;
    return await this.fetchAndCache();
  }

  public async delete(): Promise<void> {
    this.clearDebounce();
    this.data = undefined;
    this.initialized = false;
    this.notifySubscribers();

    await d.BlobAPI().deleteBlob(this.chatId, this.getBlobName());
  }

  private async fetchAndCache(): Promise<T | undefined> {
    this._isLoading = true;
    this.notifySubscribers();

    try {
      const blobContent = await d
        .BlobAPI()
        .getBlob(this.chatId, this.getBlobName());

      this.updateLocalCache(blobContent ? JSON.parse(blobContent) : undefined);
      return this.data;
    } catch (e) {
      if (is404(e)) {
        this.updateLocalCache(undefined);
        return this.data;
      }

      throw e;
    } finally {
      this._isLoading = false;
    }
  }

  private updateLocalCache(data: T | undefined): void {
    this.data = data;
    this.initialized = true;
    this.notifySubscribers();
  }

  private async persistToBlobAPI(data: T): Promise<void> {
    const blobContent = JSON.stringify(data);
    await this.saveWithRetry(blobContent);
  }

  private async saveWithRetry(
    content: string,
    attempt: number = 1
  ): Promise<void> {
    try {
      await d.BlobAPI().saveBlob(this.chatId, this.getBlobName(), content);
    } catch (e) {
      if (attempt < DEFAULT_RETRY_ATTEMPTS) {
        await delay(DEFAULT_RETRY_DELAY_MS * attempt);
        return this.saveWithRetry(content, attempt + 1);
      }
      d.ErrorService().log(
        `Failed to save blob after ${DEFAULT_RETRY_ATTEMPTS} attempts`,
        e
      );
      throw e;
    }
  }

  private scheduleDebounce(): void {
    this.clearDebounce();

    this.debounceTimeout = setTimeout(async () => {
      if (this.data !== undefined) {
        try {
          await this.persistToBlobAPI(this.data);
        } catch (e) {
          d.ErrorService().log("Failed to save debounced blob", e);
        }
      }
    }, this.getDebounceMs());
  }

  private clearDebounce(): void {
    if (!this.debounceTimeout) return;
    clearTimeout(this.debounceTimeout);

    this.debounceTimeout = undefined;
  }

  private hasPendingDebounce(): boolean {
    return this.debounceTimeout !== undefined;
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback());
  }
}

const is404 = (e: unknown): boolean =>
  e instanceof Error && e.message.includes("Blob not found");

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
