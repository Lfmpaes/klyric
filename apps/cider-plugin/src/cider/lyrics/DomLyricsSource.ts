import { findLyricContainer } from "../CiderCapabilities";
import {
  type LyricsSource,
  type LyricsSourceContext,
  LyricsSourceError,
  type RawLyricLine,
} from "./LyricsSource";

export interface DomObserver {
  observe(target: Node, options: MutationObserverInit): void;
  disconnect(): void;
}

export interface DomLyricsEnvironment {
  document: Document;
  createObserver(callback: MutationCallback): DomObserver;
  queueMicrotask(callback: () => void): void;
}

function browserEnvironment(documentRoot: Document): DomLyricsEnvironment {
  return {
    document: documentRoot,
    createObserver: (callback) => new MutationObserver(callback),
    queueMicrotask,
  };
}

export class DomLyricsSource implements LyricsSource {
  readonly kind = "dom" as const;
  readonly confidence = 60;
  private observer: DomObserver | undefined;
  private queued = false;
  private lastIdentity: string | undefined;

  constructor(
    documentRoot: Document,
    private readonly environment: DomLyricsEnvironment = browserEnvironment(
      documentRoot,
    ),
  ) {}

  async canStart(): Promise<boolean> {
    return findLyricContainer(this.environment.document) !== null;
  }

  async start(context: LyricsSourceContext): Promise<void> {
    await this.stop();
    const initialContainer = findLyricContainer(this.environment.document);
    if (initialContainer === null) {
      throw new LyricsSourceError(this.kind, "Lyric DOM container is not open");
    }
    let container: Element = initialContainer;

    const read = () => {
      this.queued = false;
      container = findLyricContainer(this.environment.document) ?? container;
      const active = findActiveLine(container);
      if (active === null) return;
      const elements = lyricElements(container);
      const currentIndex = elements.indexOf(active);
      const lines = elements.flatMap((element, index) => {
        const line = lineFromElement(element, index);
        return line === null ? [] : [line];
      });
      const currentLine = lineFromElement(active, Math.max(0, currentIndex));
      if (currentLine === null) return;
      const identity = `${currentIndex}:${currentLine.text}`;
      if (identity === this.lastIdentity) return;
      this.lastIdentity = identity;
      context.onSnapshot({
        source: this.kind,
        lines,
        currentLine,
        currentIndex: currentIndex >= 0 ? currentIndex : null,
      });
    };
    const scheduleRead = () => {
      if (this.queued) return;
      this.queued = true;
      this.environment.queueMicrotask(read);
    };

    this.observer = this.environment.createObserver(scheduleRead);
    this.observer.observe(container.parentElement ?? container, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
      attributeFilter: ["aria-current", "data-active", "data-current", "class"],
    });
    context.signal.addEventListener("abort", () => void this.stop(), {
      once: true,
    });
    read();
  }

  async stop(): Promise<void> {
    this.observer?.disconnect();
    this.observer = undefined;
    this.queued = false;
    this.lastIdentity = undefined;
  }
}

function lyricElements(container: Element): Element[] {
  return Array.from(
    container.querySelectorAll(
      '.lyric-line, [data-lyric-line], [role="listitem"], [aria-current], [data-active], [data-current]',
    ),
  );
}

function findActiveLine(container: Element): Element | null {
  return container.querySelector(
    '.lyric-line.active, [aria-current="true"], [aria-current="step"], [data-active="true"], [data-current="true"], [class~="active"]',
  );
}

function lineFromElement(element: Element, index: number): RawLyricLine | null {
  const text = element.textContent?.trim();
  if (text === undefined || text.length === 0) return null;
  const line: RawLyricLine = { text, index };
  const start = Number(element.getAttribute("data-start-time-ms"));
  if (Number.isFinite(start) && start >= 0) line.startTimeMs = start;
  return line;
}
