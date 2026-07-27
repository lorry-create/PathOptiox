type LoadingCallback = (isLoading: boolean) => void;

class LoadingStateManager {
  private listeners: Set<LoadingCallback> = new Set();
  private loadingCount: number = 0;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  subscribe(callback: LoadingCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(isLoading: boolean): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.listeners.forEach(callback => callback(isLoading));
    }, 100);
  }

  increment(): void {
    this.loadingCount++;
    this.notify(true);
  }

  decrement(): void {
    if (this.loadingCount > 0) {
      this.loadingCount--;
      if (this.loadingCount === 0) {
        this.notify(false);
      }
    }
  }

  reset(): void {
    this.loadingCount = 0;
    this.notify(false);
  }

  getLoadingCount(): number {
    return this.loadingCount;
  }

  isLoading(): boolean {
    return this.loadingCount > 0;
  }
}

export const loadingStateManager = new LoadingStateManager();
