import {
  type LyricsSource,
  type LyricsSourceContext,
  LyricsSourceError,
  type RawLyricLine,
} from "./LyricsSource";

export interface TimelineProvider {
  getLines(): readonly RawLyricLine[];
  getPositionMs(): number;
  isPlaying(): boolean;
  subscribe(callback: () => void): () => void;
}

export interface TimelineClock {
  setTimeout(
    callback: () => void,
    delayMs: number,
  ): ReturnType<typeof setTimeout>;
  clearTimeout(handle: ReturnType<typeof setTimeout>): void;
}

const systemClock: TimelineClock = {
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: (handle) => clearTimeout(handle),
};

export function findActiveLineIndex(
  lines: readonly RawLyricLine[],
  positionMs: number,
): number | null {
  let low = 0;
  let high = lines.length - 1;
  let result: number | null = null;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const start = lines[middle]?.startTimeMs;
    if (start !== undefined && start <= positionMs) {
      result = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return result;
}

export class TimelineLyricsSource implements LyricsSource {
  readonly kind = "timeline" as const;
  readonly confidence = 80;
  private cleanup: (() => void) | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly provider: TimelineProvider,
    private readonly clock: TimelineClock = systemClock,
  ) {}

  async canStart(): Promise<boolean> {
    const lines = this.sortedLines();
    return (
      lines.length > 0 && lines.every((line) => line.startTimeMs !== undefined)
    );
  }

  async start(context: LyricsSourceContext): Promise<void> {
    await this.stop();
    if (!(await this.canStart())) {
      throw new LyricsSourceError(
        this.kind,
        "No complete timed lyric timeline",
      );
    }
    const emit = () => {
      this.cancelTimer();
      const lines = this.sortedLines();
      const positionMs = this.provider.getPositionMs();
      const currentIndex = findActiveLineIndex(lines, positionMs);
      const currentLine =
        currentIndex === null ? null : (lines[currentIndex] ?? null);
      context.onSnapshot({
        source: this.kind,
        lines,
        currentLine,
        currentIndex,
        positionMs,
      });

      const nextLine =
        currentIndex === null ? lines[0] : lines[currentIndex + 1];
      if (this.provider.isPlaying()) {
        const boundaryDelay =
          nextLine?.startTimeMs === undefined
            ? 5_000
            : Math.max(0, nextLine.startTimeMs - positionMs);
        const delay = Math.min(boundaryDelay, 5_000);
        this.timer = this.clock.setTimeout(emit, delay);
      }
    };
    this.cleanup = this.provider.subscribe(emit);
    context.signal.addEventListener("abort", () => void this.stop(), {
      once: true,
    });
    emit();
  }

  async stop(): Promise<void> {
    this.cleanup?.();
    this.cleanup = undefined;
    this.cancelTimer();
  }

  private sortedLines(): RawLyricLine[] {
    return [...this.provider.getLines()].sort(
      (left, right) =>
        (left.startTimeMs ?? Number.POSITIVE_INFINITY) -
        (right.startTimeMs ?? Number.POSITIVE_INFINITY),
    );
  }

  private cancelTimer(): void {
    if (this.timer !== undefined) this.clock.clearTimeout(this.timer);
    this.timer = undefined;
  }
}
