import {
  createLyricsSources,
  type LyricsSource,
  type LyricsSourceContext,
  LyricsSourceFactory,
} from "../cider/lyrics";
import {
  type PlaybackEnvironment,
  type PlaybackObserver,
  PlaybackSource,
} from "../cider/PlaybackSource";
import { CleanupRegistry } from "./CleanupRegistry";
import {
  PluginStateMachine,
  type PluginStateMachineOptions,
} from "./PluginStateMachine";

export interface KLyricPluginDependencies {
  root?: unknown;
  document?: Document;
  playback?: PlaybackObserver;
  createPlaybackEnvironment?: () => PlaybackEnvironment;
  createLyricsSources?: (
    root: unknown,
    documentRoot: Document,
  ) => readonly LyricsSource[];
  stateMachine?: PluginStateMachine;
  stateMachineOptions?: PluginStateMachineOptions;
  onError?: (error: Error) => void;
}

/** Coordinates host observers and guarantees teardown is safe to repeat. */
export class KLyricPlugin {
  private readonly dependencies: KLyricPluginDependencies;
  private cleanup: CleanupRegistry | undefined;
  private activeLyrics: LyricsSource | undefined;
  private stateMachine: PluginStateMachine | undefined;
  private started = false;

  public constructor(dependencies: KLyricPluginDependencies = {}) {
    this.dependencies = dependencies;
  }

  public async setup(): Promise<void> {
    await this.teardown();
    this.started = true;
    const cleanup = new CleanupRegistry();
    const abortController = new AbortController();
    const documentRoot = this.dependencies.document ?? document;
    const root = this.dependencies.root ?? globalThis;
    const machine =
      this.dependencies.stateMachine ??
      new PluginStateMachine(this.dependencies.stateMachineOptions);
    const playback =
      this.dependencies.playback ??
      new PlaybackSource(this.dependencies.createPlaybackEnvironment?.());
    const factory = new LyricsSourceFactory(
      (this.dependencies.createLyricsSources ?? createLyricsSources)(
        root,
        documentRoot,
      ),
    );

    this.cleanup = cleanup;
    this.stateMachine = machine;
    cleanup.add(() => playback.stop());
    cleanup.add(() => factory.stop());
    cleanup.add(() => abortController.abort());

    machine.start();
    playback.start({
      signal: abortController.signal,
      onSnapshot: (snapshot) => machine.setPlayback(snapshot),
      onError: (error) => this.report(error),
    });
    await this.startLyrics(factory, abortController.signal);
  }

  public async teardown(): Promise<void> {
    this.started = false;
    const cleanup = this.cleanup;
    this.cleanup = undefined;
    this.activeLyrics = undefined;
    this.stateMachine = undefined;
    if (cleanup === undefined) return;
    try {
      await cleanup.dispose();
    } catch (error) {
      this.report(
        error instanceof Error ? error : new Error("Plugin cleanup failed"),
      );
    }
  }

  public isStarted(): boolean {
    return this.started;
  }

  private async startLyrics(
    factory: LyricsSourceFactory,
    signal: AbortSignal,
    failed?: LyricsSource,
  ): Promise<void> {
    let observedError = false;
    const context: LyricsSourceContext = {
      signal,
      onSnapshot: (snapshot) => this.stateMachine?.setLyrics(snapshot),
      onError: (error) => {
        observedError = true;
        this.stateMachine?.sourceFailed();
        void this.recoverLyrics(factory, signal, error.source);
      },
    };
    const source =
      failed === undefined
        ? await factory.startBest(context)
        : await factory.startFallback(context, failed);
    if (!this.started || signal.aborted) return;
    this.activeLyrics = source ?? undefined;
    if (source !== null) {
      this.stateMachine?.setSourceKind(source.kind);
    } else if (failed === undefined && !observedError) {
      this.stateMachine?.setSourceKind("none");
    }
  }

  private async recoverLyrics(
    factory: LyricsSourceFactory,
    signal: AbortSignal,
    failedKind: LyricsSource["kind"],
  ): Promise<void> {
    if (
      !this.started ||
      signal.aborted ||
      this.activeLyrics?.kind !== failedKind
    )
      return;
    await this.startLyrics(factory, signal, this.activeLyrics);
  }

  private report(error: Error): void {
    this.dependencies.onError?.(error);
  }
}
