import {
  type LyricsSource,
  type LyricsSourceContext,
  LyricsSourceError,
  normalizeLines,
} from "./LyricsSource";

export interface PublicLyricsApi {
  getLyrics(): unknown | Promise<unknown>;
  subscribe?(callback: () => void): (() => void) | undefined;
}

export class PublicApiLyricsSource implements LyricsSource {
  readonly kind = "public-api" as const;
  readonly confidence = 100;
  private cleanup: (() => void) | undefined;

  constructor(private readonly api?: PublicLyricsApi) {}

  async canStart(): Promise<boolean> {
    return this.api !== undefined && typeof this.api.getLyrics === "function";
  }

  async start(context: LyricsSourceContext): Promise<void> {
    await this.stop();
    if (!(await this.canStart()) || this.api === undefined) {
      throw new LyricsSourceError(
        this.kind,
        "Cider exposes no documented lyrics API",
      );
    }

    const emit = async () => {
      try {
        const lines = normalizeLines(await this.api?.getLyrics());
        if (lines.length > 0) {
          context.onSnapshot({
            source: this.kind,
            lines,
            currentLine: null,
            currentIndex: null,
          });
        }
      } catch (error) {
        context.onError(
          new LyricsSourceError(this.kind, "Public lyrics API read failed", {
            cause: error,
          }),
        );
      }
    };
    const cleanup = this.api.subscribe?.(() => void emit());
    this.cleanup = typeof cleanup === "function" ? cleanup : undefined;
    context.signal.addEventListener("abort", () => void this.stop(), {
      once: true,
    });
    await emit();
  }

  async stop(): Promise<void> {
    this.cleanup?.();
    this.cleanup = undefined;
  }
}
