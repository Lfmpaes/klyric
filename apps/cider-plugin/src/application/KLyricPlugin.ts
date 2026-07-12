import {
  createLyricsSources,
  DomLyricsDiscovery,
  type LyricsDiscovery,
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

export interface LyricsRetryClock {
  setTimeout(
    callback: () => void,
    delayMs: number,
  ): ReturnType<typeof setTimeout>;
  clearTimeout(timer: ReturnType<typeof setTimeout>): void;
}

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
  createLyricsDiscovery?: (
    documentRoot: Document,
    onAvailable: () => void,
  ) => LyricsDiscovery;
  stateMachine?: PluginStateMachine;
  stateMachineOptions?: PluginStateMachineOptions;
  settingsStore?: PluginSettingsStore;
  bridgeTransport?: BridgeTransport;
  createPublisher?: (settings: PluginSettings) => StatePublisher;
  diagnostics?: Diagnostics;
  onError?: (error: Error) => void;
  lyricsRetryClock?: LyricsRetryClock;
  lyricsRetryDelaysMs?: readonly number[];
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
  private lyricsSourceGeneration = 0;
  private lyricsRetryTimer: ReturnType<typeof setTimeout> | undefined;
  private lyricsRetryAttempt = 0;
  private lyricsRetryGeneration = 0;
  private lyricsDiscovery: LyricsDiscovery | undefined;
  private lyricsDiscoveryPending = false;
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
    this.lyricsFactory = factory;
    this.lyricsSignal = abortController.signal;
    cleanup.add(() => abortController.abort());
    cleanup.add(() => this.stopLyricsDiscovery());
    cleanup.add(() => factory.stop());
    cleanup.add(() => playback.stop());
    cleanup.add(() => queue.stop(true));
    cleanup.add(
      machine.subscribe((phase, state) => {
        this.dependencies.diagnostics?.setState(phase, state.sourceKind);
        if (settings.enabled) queue.enqueue(state);
        this.scheduleLyricsRetry(phase, state);
        this.reconcileLyricsDiscovery(phase, state, documentRoot);
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
        if (trackChanged) {
          this.lyricsRetryGeneration++;
          this.cancelLyricsRetry(true);
          this.stopLyricsDiscovery();
        }
        this.previousTrackIdentity = nextIdentity;
        machine.setPlayback(snapshot);
        if (trackChanged) void this.restartLyrics();
      },
      onError: (error) => this.report(error),
    });
    await this.startLyrics(factory, abortController.signal);
  }

  public async teardown(): Promise<void> {
    this.started = false;
    this.cancelLyricsRetry(true);
    this.stopLyricsDiscovery();
    const cleanup = this.cleanup;
    this.cleanup = undefined;
    this.activeLyrics = undefined;
    this.lyricsFactory = undefined;
    this.lyricsSignal = undefined;
    this.stateMachine = undefined;
    this.previousTrackIdentity = undefined;
    this.lyricsSourceGeneration++;
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
    const generation = ++this.lyricsSourceGeneration;
    let observedError = false;
    const ownsCallbacks = () =>
      this.started &&
      !signal.aborted &&
      generation === this.lyricsSourceGeneration &&
      factory === this.lyricsFactory &&
      signal === this.lyricsSignal;
    const context: LyricsSourceContext = {
      signal,
      onSnapshot: (snapshot) => {
        if (!ownsCallbacks()) return;
        this.stateMachine?.setLyrics(snapshot);
      },
      onError: (error) => {
        if (!ownsCallbacks()) return;
        observedError = true;
        this.stateMachine?.sourceFailed();
        void this.recoverLyrics(factory, signal, error.source);
      },
    };
    const source =
      failed === undefined
        ? await factory.startBest(context)
        : await factory.startFallback(context, failed);
    if (!ownsCallbacks()) return;
    this.activeLyrics = source ?? undefined;
    if (source !== null) {
      this.stopLyricsDiscovery();
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

  private reconcileLyricsDiscovery(
    phase: string,
    state: {
      playbackStatus: string;
      track: unknown;
      hasLyrics: boolean;
      lyricsKind: string;
    },
    documentRoot: Document,
  ): void {
    if (
      !this.started ||
      phase === "source-error" ||
      state.playbackStatus !== "playing" ||
      state.track === null ||
      state.hasLyrics ||
      state.lyricsKind !== "unavailable"
    ) {
      this.stopLyricsDiscovery();
      return;
    }
    if (this.lyricsDiscovery !== undefined || this.lyricsDiscoveryPending)
      return;
    const factory = this.lyricsFactory;
    const signal = this.lyricsSignal;
    if (factory === undefined || signal === undefined) return;
    const generation = this.lyricsRetryGeneration;
    let triggered = false;
    const discovery = (
      this.dependencies.createLyricsDiscovery ??
      ((root, onAvailable) => new DomLyricsDiscovery(root, onAvailable))
    )(documentRoot, () => {
      if (triggered) return;
      triggered = true;
      this.lyricsDiscoveryPending = true;
      discovery.stop();
      if (this.lyricsDiscovery === discovery) this.lyricsDiscovery = undefined;
      if (
        !this.started ||
        signal.aborted ||
        generation !== this.lyricsRetryGeneration ||
        factory !== this.lyricsFactory ||
        signal !== this.lyricsSignal
      ) {
        this.lyricsDiscoveryPending = false;
        return;
      }
      void this.startLyrics(factory, signal).finally(() => {
        this.lyricsDiscoveryPending = false;
      });
    });
    this.lyricsDiscovery = discovery;
    discovery.start();
  }

  private stopLyricsDiscovery(): void {
    this.lyricsDiscovery?.stop();
    this.lyricsDiscovery = undefined;
    this.lyricsDiscoveryPending = false;
  }

  private scheduleLyricsRetry(
    phase: string,
    state: {
      playbackStatus: string;
      track: unknown;
      hasLyrics: boolean;
      lyricsKind: string;
    },
  ): void {
    if (
      !this.started ||
      phase === "source-error" ||
      state.playbackStatus !== "playing" ||
      state.track === null ||
      state.hasLyrics ||
      state.lyricsKind !== "unavailable"
    ) {
      this.cancelLyricsRetry(
        state.hasLyrics ||
          state.playbackStatus !== "playing" ||
          state.track === null,
      );
      return;
    }
    if (this.lyricsRetryTimer !== undefined) return;
    const delayMs = this.lyricsRetryDelaysMs()[this.lyricsRetryAttempt];
    if (delayMs === undefined) return;
    const generation = this.lyricsRetryGeneration;
    const factory = this.lyricsFactory;
    const signal = this.lyricsSignal;
    if (factory === undefined || signal === undefined) return;
    this.lyricsRetryAttempt++;
    this.lyricsRetryTimer = this.lyricsRetryClock().setTimeout(() => {
      this.lyricsRetryTimer = undefined;
      if (
        !this.started ||
        signal.aborted ||
        generation !== this.lyricsRetryGeneration ||
        factory !== this.lyricsFactory ||
        signal !== this.lyricsSignal
      )
        return;
      void this.startLyrics(factory, signal);
    }, delayMs);
  }

  private cancelLyricsRetry(resetAttempts: boolean): void {
    if (this.lyricsRetryTimer !== undefined) {
      this.lyricsRetryClock().clearTimeout(this.lyricsRetryTimer);
      this.lyricsRetryTimer = undefined;
    }
    if (resetAttempts) this.lyricsRetryAttempt = 0;
  }

  private lyricsRetryClock(): LyricsRetryClock {
    return (
      this.dependencies.lyricsRetryClock ?? {
        setTimeout,
        clearTimeout,
      }
    );
  }

  private lyricsRetryDelaysMs(): readonly number[] {
    return this.dependencies.lyricsRetryDelaysMs ?? [500, 1_000, 2_000];
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
    factory.resetFailures();
    await this.startLyrics(factory, signal);
  }
}
