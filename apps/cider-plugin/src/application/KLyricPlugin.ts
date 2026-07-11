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
import type { Diagnostics } from "../diagnostics/Diagnostics";
import { BridgeClient, type BridgeTransport } from "../publisher/BridgeClient";
import { PublishQueue, type StatePublisher } from "../publisher/PublishQueue";
import {
  type PluginSettings,
  PluginSettingsStore,
} from "../settings/PluginSettings";
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
    preference?: PluginSettings["sourcePreference"],
  ) => readonly LyricsSource[];
  stateMachine?: PluginStateMachine;
  stateMachineOptions?: PluginStateMachineOptions;
  settingsStore?: PluginSettingsStore;
  bridgeTransport?: BridgeTransport;
  createPublisher?: (settings: PluginSettings) => StatePublisher;
  diagnostics?: Diagnostics;
  onError?: (error: Error) => void;
}

/** Coordinates host observers and guarantees teardown is safe to repeat. */
export class KLyricPlugin {
  private readonly dependencies: KLyricPluginDependencies;
  private cleanup: CleanupRegistry | undefined;
  private activeLyrics: LyricsSource | undefined;
  private lyricsFactory: LyricsSourceFactory | undefined;
  private lyricsSignal: AbortSignal | undefined;
  private stateMachine: PluginStateMachine | undefined;
  private previousTrackIdentity: string | undefined;
  private ignoreUnidentifiedLyrics = false;
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
    const settings = (
      this.dependencies.settingsStore ?? new PluginSettingsStore()
    ).load();
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
        settings.sourcePreference,
      ),
    );
    const publisher =
      this.dependencies.createPublisher?.(settings) ??
      new BridgeClient(settings, this.dependencies.bridgeTransport);
    const queue = new PublishQueue(publisher, {
      onConnection: (connected) => {
        machine.setConnected(connected);
        this.dependencies.diagnostics?.setBridgeConnected(connected);
      },
      onError: (error) => {
        machine.setConnected(false);
        machine.bridgeFailed();
        this.dependencies.diagnostics?.recordError(error);
        this.report(error);
      },
    });

    this.cleanup = cleanup;
    this.stateMachine = machine;
    cleanup.add(() => abortController.abort());
    cleanup.add(() => factory.stop());
    cleanup.add(() => playback.stop());
    cleanup.add(() => queue.stop(true));
    cleanup.add(
      machine.subscribe((phase, state) => {
        this.dependencies.diagnostics?.setState(phase, state.sourceKind);
        if (settings.enabled) queue.enqueue(state);
      }),
    );

    let heartbeatTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleHeartbeat = () => {
      if (heartbeatTimer !== undefined) clearTimeout(heartbeatTimer);
      heartbeatTimer = undefined;
      if (!settings.enabled || machine.currentPhase() !== "playing-with-lyrics")
        return;
      heartbeatTimer = setTimeout(() => {
        queue.enqueue(machine.heartbeat(), true);
        scheduleHeartbeat();
      }, settings.heartbeatIntervalMs);
    };
    cleanup.add(() => {
      if (heartbeatTimer !== undefined) clearTimeout(heartbeatTimer);
    });
    cleanup.add(machine.subscribe(() => scheduleHeartbeat()));

    machine.start();
    machine.setEnabled(settings.enabled);
    void this.connect(machine, publisher);
    playback.start({
      signal: abortController.signal,
      onSnapshot: (snapshot) => {
        const nextIdentity =
          snapshot.track?.id ?? JSON.stringify(snapshot.track);
        const trackChanged =
          this.previousTrackIdentity !== undefined &&
          nextIdentity !== this.previousTrackIdentity;
        this.previousTrackIdentity = nextIdentity;
        machine.setPlayback(snapshot);
        if (trackChanged) void this.restartLyrics();
      },
      onError: (error) => this.report(error),
    });
    await this.startLyrics(factory, abortController.signal);
    this.lyricsFactory = factory;
    this.lyricsSignal = abortController.signal;
  }

  public async teardown(): Promise<void> {
    this.started = false;
    const cleanup = this.cleanup;
    this.cleanup = undefined;
    this.activeLyrics = undefined;
    this.lyricsFactory = undefined;
    this.lyricsSignal = undefined;
    this.stateMachine = undefined;
    this.previousTrackIdentity = undefined;
    this.ignoreUnidentifiedLyrics = false;
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
      onSnapshot: (snapshot) => {
        if (this.ignoreUnidentifiedLyrics && snapshot.trackId === undefined) {
          this.ignoreUnidentifiedLyrics = false;
          return;
        }
        this.ignoreUnidentifiedLyrics = false;
        this.stateMachine?.setLyrics(snapshot);
      },
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

  private async connect(
    machine: PluginStateMachine,
    publisher: StatePublisher,
  ): Promise<void> {
    if (!(publisher instanceof BridgeClient)) return;
    try {
      await publisher.health();
      if (this.started) machine.setConnected(true);
    } catch (error) {
      if (this.started) machine.setConnected(false);
      this.dependencies.diagnostics?.recordError(
        error instanceof Error
          ? error
          : new Error("Bridge health check failed"),
      );
    }
  }

  private async restartLyrics(): Promise<void> {
    const factory = this.lyricsFactory;
    const signal = this.lyricsSignal;
    if (!this.started || factory === undefined || signal === undefined) return;
    this.ignoreUnidentifiedLyrics = true;
    factory.resetFailures();
    await this.startLyrics(factory, signal);
  }
}
