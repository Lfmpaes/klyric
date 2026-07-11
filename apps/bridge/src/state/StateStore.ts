import type { KLyricState, StateClearReason } from "@klyric/protocol";
import { validateStateTransition } from "@klyric/protocol";

export type StateChange =
  | { readonly kind: "accepted"; readonly state: KLyricState }
  | { readonly kind: "duplicate"; readonly state: KLyricState }
  | { readonly kind: "stale"; readonly state: KLyricState }
  | { readonly kind: "cleared"; readonly reason: StateClearReason }
  | { readonly kind: "unchanged" };

function displayIdentity(state: KLyricState): string {
  const {
    emittedAt: _emittedAt,
    sequence: _sequence,
    stale: _stale,
    ...display
  } = state;
  return JSON.stringify(display);
}

function stoppedState(state: KLyricState): KLyricState {
  if (state.playbackStatus !== "stopped") {
    return state;
  }

  return {
    ...state,
    lyricsKind: "unavailable",
    sourceKind: "none",
    currentLine: null,
    previousLine: null,
    nextLine: null,
    hasLyrics: false,
    stale: false,
  };
}

/** Stores one normalized state only; lyric content never reaches disk. */
export class StateStore {
  private state: KLyricState | null = null;
  private lastPublicationAt = 0;
  private publisherSeenAt: number | null = null;

  public publish(state: KLyricState, now = Date.now()): StateChange {
    validateStateTransition(this.state, state);
    const normalized = stoppedState(state);
    const duplicate =
      this.state !== null &&
      displayIdentity(this.state) === displayIdentity(normalized);
    this.state = normalized;
    this.lastPublicationAt = now;
    this.publisherSeenAt = now;
    return duplicate
      ? { kind: "duplicate", state: normalized }
      : { kind: "accepted", state: normalized };
  }

  public current(): KLyricState | null {
    return this.state;
  }

  public publisherSeen(): boolean {
    return this.publisherSeenAt !== null;
  }

  public clear(reason: StateClearReason): StateChange {
    if (this.state === null) {
      return { kind: "unchanged" };
    }
    this.state = null;
    this.lastPublicationAt = 0;
    return { kind: "cleared", reason };
  }

  public expire(
    now: number,
    playingTtlMs: number,
    pausedTtlMs: number,
  ): StateChange {
    if (this.state === null) return { kind: "unchanged" };
    const elapsed = now - this.lastPublicationAt;
    if (this.state.playbackStatus === "playing" && elapsed >= playingTtlMs) {
      if (this.state.stale) return { kind: "unchanged" };
      this.state = { ...this.state, stale: true };
      return { kind: "stale", state: this.state };
    }
    if (this.state.playbackStatus === "paused" && elapsed >= pausedTtlMs) {
      return this.clear("expired");
    }
    return { kind: "unchanged" };
  }
}
