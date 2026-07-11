import {
  type LyricsSource,
  type LyricsSourceContext,
  LyricsSourceError,
} from "./LyricsSource";

export class LyricsSourceFactory {
  private active: LyricsSource | undefined;

  constructor(private readonly sources: readonly LyricsSource[]) {}

  async startBest(
    context: LyricsSourceContext,
    excluded: ReadonlySet<LyricsSource["kind"]> = new Set(),
  ): Promise<LyricsSource | null> {
    await this.stop();
    const candidates = [...this.sources].sort(
      (left, right) => right.confidence - left.confidence,
    );
    for (const source of candidates) {
      if (excluded.has(source.kind)) continue;
      try {
        if (!(await source.canStart())) continue;
        await source.start(context);
        this.active = source;
        return source;
      } catch (error) {
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

  async startFallback(
    context: LyricsSourceContext,
    failed: LyricsSource,
  ): Promise<LyricsSource | null> {
    return this.startBest(context, new Set([failed.kind]));
  }

  async stop(): Promise<void> {
    await this.active?.stop();
    this.active = undefined;
  }
}
