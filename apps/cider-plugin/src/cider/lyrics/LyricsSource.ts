export type SourceKind = "public-api" | "internal-store" | "timeline" | "dom";

export interface RawLyricLine {
  text: string;
  index?: number;
  startTimeMs?: number;
  endTimeMs?: number;
  isInstrumental?: boolean;
}

export interface RawLyricsSnapshot {
  source: SourceKind;
  lines: readonly RawLyricLine[];
  currentLine: RawLyricLine | null;
  currentIndex: number | null;
  positionMs?: number;
  trackId?: string;
}

export class LyricsSourceError extends Error {
  constructor(
    readonly source: SourceKind,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "LyricsSourceError";
  }
}

export interface LyricsSourceContext {
  signal: AbortSignal;
  onSnapshot(snapshot: RawLyricsSnapshot): void;
  onError(error: LyricsSourceError): void;
}

export interface LyricsSource {
  readonly kind: SourceKind;
  readonly confidence: number;

  canStart(): Promise<boolean>;
  start(context: LyricsSourceContext): Promise<void>;
  stop(): Promise<void>;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeLine(
  value: unknown,
  fallbackIndex?: number,
): RawLyricLine | null {
  if (!isRecord(value)) return null;

  const rawText = value.text ?? value.lyric ?? value.content;
  if (typeof rawText !== "string" || rawText.trim().length === 0) return null;

  const line: RawLyricLine = { text: rawText.trim() };
  const index = finiteNumber(value.index) ?? fallbackIndex;
  const startTimeMs = milliseconds(
    value.startTimeMs ?? value.startTime ?? value.time,
  );
  const endTimeMs = milliseconds(value.endTimeMs ?? value.endTime);

  if (index !== undefined) line.index = index;
  if (startTimeMs !== undefined) line.startTimeMs = startTimeMs;
  if (endTimeMs !== undefined) line.endTimeMs = endTimeMs;
  if (value.isInstrumental === true) line.isInstrumental = true;
  return line;
}

export function normalizeLines(value: unknown): RawLyricLine[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((line, index) => {
    const normalized = normalizeLine(line, index);
    return normalized === null ? [] : [normalized];
  });
}

export function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function milliseconds(value: unknown): number | undefined {
  const number = finiteNumber(value);
  if (number === undefined || number < 0) return undefined;
  return number < 1_000 ? number * 1_000 : number;
}
