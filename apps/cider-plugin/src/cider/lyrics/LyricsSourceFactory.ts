import {
  type LyricsSource,
  type LyricsSourceContext,
  LyricsSourceError,
} from "./LyricsSource";

export class LyricsSourceFactory {
  private active: LyricsSource | undefined;

  constructor(private readonly sources: readonly LyricsSource[]) {}

  async startBest(context: LyricsSourceContext): Promise<LyricsSource | null> {
    await this.stop();
    const candidates = [...this.sources].sort(
      (left, right) => right.confidence - left.confidence,
    );
    for (const source of candidates) {
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

  async stop(): Promise<void> {
    await this.active?.stop();
    this.active = undefined;
  }
}
