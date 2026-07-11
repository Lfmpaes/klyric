import type { KLyricState } from "@klyric/protocol";
import { BridgeClientError } from "./BridgeClient";

export interface StatePublisher {
  publish(state: KLyricState): Promise<void>;
  clear(): Promise<void>;
}

export interface QueueClock {
  setTimeout(
    callback: () => void,
    delayMs: number,
  ): ReturnType<typeof setTimeout>;
  clearTimeout(handle: ReturnType<typeof setTimeout>): void;
}

const systemClock: QueueClock = { setTimeout, clearTimeout };
const RETRY_DELAYS_MS = [
  250, 500, 1_000, 2_000, 5_000, 10_000, 30_000,
] as const;

export interface PublishQueueOptions {
  clock?: QueueClock;
  onConnection?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

/** Serializes bridge writes while retaining only the newest pending state. */
export class PublishQueue {
  private readonly clock: QueueClock;
  private readonly onConnection: (connected: boolean) => void;
  private readonly onError: (error: Error) => void;
  private pending: KLyricState | undefined;
  private lastAcceptedIdentity: string | undefined;
  private running = false;
  private stopped = false;
  private retryAttempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;

  public constructor(
    private readonly publisher: StatePublisher,
    options: PublishQueueOptions = {},
  ) {
    this.clock = options.clock ?? systemClock;
    this.onConnection = options.onConnection ?? (() => undefined);
    this.onError = options.onError ?? (() => undefined);
  }

  public enqueue(state: KLyricState, force = false): void {
    if (this.stopped) return;
    const identity = displayIdentity(state);
    if (
      !force &&
      identity === this.lastAcceptedIdentity &&
      this.pending === undefined
    )
      return;
    this.pending = state;
    void this.drain();
  }

  public async stop(clear = false): Promise<void> {
    this.stopped = true;
    if (this.retryTimer !== undefined) this.clock.clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    this.pending = undefined;
    if (clear) {
      try {
        await this.publisher.clear();
      } catch {
        // Shutdown must not delay Cider or surface a token-bearing request.
      }
    }
  }

  private async drain(): Promise<void> {
    if (this.running || this.stopped || this.retryTimer !== undefined) return;
    this.running = true;
    try {
      while (this.pending !== undefined && !this.stopped) {
        const state = this.pending;
        this.pending = undefined;
        try {
          await this.publisher.publish(state);
          this.lastAcceptedIdentity = displayIdentity(state);
          this.retryAttempt = 0;
          this.onConnection(true);
        } catch (error) {
          const normalized =
            error instanceof Error ? error : new Error("Publication failed");
          this.onConnection(false);
          this.onError(normalized);
          if (!isRetryable(normalized)) break;
          this.pending = state;
          this.scheduleRetry();
          break;
        }
      }
    } finally {
      this.running = false;
    }
  }

  private scheduleRetry(): void {
    const delay =
      RETRY_DELAYS_MS[
        Math.min(this.retryAttempt, RETRY_DELAYS_MS.length - 1)
      ] ?? 30_000;
    this.retryAttempt++;
    this.retryTimer = this.clock.setTimeout(() => {
      this.retryTimer = undefined;
      void this.drain();
    }, delay);
  }
}

function displayIdentity(state: KLyricState): string {
  const { emittedAt: _emittedAt, sequence: _sequence, ...display } = state;
  return JSON.stringify(display);
}

function isRetryable(error: Error): boolean {
  return (
    !(error instanceof BridgeClientError) ||
    error.kind === "network" ||
    error.kind === "server"
  );
}
