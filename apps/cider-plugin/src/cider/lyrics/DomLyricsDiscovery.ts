import { findLyricContainer } from "../CiderCapabilities";

export interface DomDiscoveryObserver {
  observe(target: Node, options: MutationObserverInit): void;
  disconnect(): void;
}

export interface DomLyricsDiscoveryEnvironment {
  document: Document;
  createObserver(callback: MutationCallback): DomDiscoveryObserver;
  setTimeout(
    callback: () => void,
    delayMs: number,
  ): ReturnType<typeof setTimeout>;
  clearTimeout(timer: ReturnType<typeof setTimeout>): void;
}

function browserEnvironment(
  documentRoot: Document,
): DomLyricsDiscoveryEnvironment {
  return {
    document: documentRoot,
    createObserver: (callback) => new MutationObserver(callback),
    setTimeout,
    clearTimeout,
  };
}

export interface LyricsDiscovery {
  start(): void;
  stop(): void;
}

/** Watches structurally for a Lyrics container without inspecting lyric content. */
export class DomLyricsDiscovery implements LyricsDiscovery {
  private observer: DomDiscoveryObserver | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private triggered = false;

  constructor(
    documentRoot: Document,
    private readonly onAvailable: () => void,
    private readonly environment: DomLyricsDiscoveryEnvironment = browserEnvironment(
      documentRoot,
    ),
  ) {}

  public start(): void {
    if (this.stopped || this.observer !== undefined) return;
    const root = this.environment.document.documentElement;
    if (root === null) return;
    this.observer = this.environment.createObserver(() => this.check());
    this.observer.observe(root, { childList: true, subtree: true });
    this.check();
  }

  public stop(): void {
    this.stopped = true;
    this.observer?.disconnect();
    this.observer = undefined;
    if (this.timer !== undefined) this.environment.clearTimeout(this.timer);
    this.timer = undefined;
  }

  private check(): void {
    if (
      this.stopped ||
      this.triggered ||
      findLyricContainer(this.environment.document) === null
    )
      return;
    this.triggered = true;
    this.observer?.disconnect();
    this.observer = undefined;
    this.timer = this.environment.setTimeout(() => {
      this.timer = undefined;
      if (!this.stopped) this.onAvailable();
    }, 0);
  }
}
