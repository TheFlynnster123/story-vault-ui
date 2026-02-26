export class GenerationOrchestrator {
  public IsLoading: boolean = false;
  public Status?: string;

  private subscribers = new Set<() => void>();

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  protected async orchestrate<T>(
    steps: () => Promise<T>,
  ): Promise<T | undefined> {
    this.setIsLoading(true);

    try {
      return await steps();
    } finally {
      this.setIsLoading(false);
      this.setStatus();
    }
  }

  protected setStatus = (status?: string) => {
    this.Status = status;
    this.notifySubscribers();
  };

  private setIsLoading = (isLoading: boolean) => {
    this.IsLoading = isLoading;
    this.notifySubscribers();
  };

  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback());
  }
}
