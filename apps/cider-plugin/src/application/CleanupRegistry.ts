export type Cleanup = () => void | Promise<void>;

/** Owns plugin resources so setup and hot reload always release them once. */
export class CleanupRegistry {
  private cleanups: Cleanup[] = [];
  private closed = false;

  public add(cleanup: Cleanup): Cleanup {
    if (this.closed) {
      void cleanup();
      return cleanup;
    }
    this.cleanups.push(cleanup);
    return cleanup;
  }

  public async dispose(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    const cleanups = this.cleanups.reverse();
    this.cleanups = [];
    const failures: unknown[] = [];
    for (const cleanup of cleanups) {
      try {
        await cleanup();
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length > 0) {
      throw new AggregateError(failures, "KLyric cleanup failed");
    }
  }
}
