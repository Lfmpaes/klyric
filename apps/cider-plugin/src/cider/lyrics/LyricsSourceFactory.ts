import {
  type LyricsSource,
  type LyricsSourceContext,
  LyricsSourceError,
} from "./LyricsSource";

export class LyricsSourceFactory {
  private active: LyricsSource | undefined;
  private readonly failedKinds = new Set<LyricsSource["kind"]>();
  private transition: Promise<void> = Promise.resolve();

  constructor(private readonly sources: readonly LyricsSource[]) {}

  async startBest(
    context: LyricsSourceContext,
    excluded: ReadonlySet<LyricsSource["kind"]> = new Set(),
  ): Promise<LyricsSource | null> {
    return this.enqueue(() => this.startBestNow(context, excluded));
  }

  async startFallback(
    context: LyricsSourceContext,
    failed: LyricsSource,
  ): Promise<LyricsSource | null> {
    this.failedKinds.add(failed.kind);
    return this.startBest(context);
  }

  resetFailures(): void {
    this.failedKinds.clear();
  }

  async stop(): Promise<void> {
    await this.enqueue(() => this.stopActive());
  }

  private async startBestNow(
    context: LyricsSourceContext,
    excluded: ReadonlySet<LyricsSource["kind"]>,
  ): Promise<LyricsSource | null> {
    await this.stopActive();
    const candidates = [...this.sources].sort(
      (left, right) => right.confidence - left.confidence,
    );
    for (const source of candidates) {
      if (excluded.has(source.kind) || this.failedKinds.has(source.kind))
        continue;
      try {
        if (!(await source.canStart())) continue;
        await source.start(context);
        this.active = source;
        return source;
      } catch (error) {
        this.failedKinds.add(source.kind);
        await source.stop();
        context.onError(
          error instanceof LyricsSourceError
            ? error
            : new LyricsSourceError(source.kind, "Lyric source start failed", {
                cause: error,
              }),
        );
      }
    }
    return null;
  }

  private async stopActive(): Promise<void> {
    await this.active?.stop();
    this.active = undefined;
  }

  private async enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.transition.then(operation, operation);
    this.transition = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
