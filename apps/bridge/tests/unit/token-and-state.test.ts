import { describe, expect, test } from "bun:test";
import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { validStateFixture } from "@klyric/protocol";
import { PublisherTokenStore } from "../../src/auth/PublisherToken";
import { StateStore } from "../../src/state/StateStore";

describe("publisher token storage", () => {
  test("creates a private token, compares it safely, and rotates it", async () => {
    const root = join("/tmp", `klyric-token-${crypto.randomUUID()}`);
    await mkdir(root, { recursive: true });
    const path = join(root, "publisher-token");
    const store = new PublisherTokenStore(path);
    await store.initialize();
    const first = await store.loadOrCreate();
    expect(first).toHaveLength(43);
    expect(store.matches(first)).toBe(true);
    expect(store.matches("not-a-valid-token")).toBe(false);
    expect((await stat(path)).mode & 0o777).toBe(0o600);
    const second = await store.rotateActive();
    expect(second).not.toBe(first);
    expect(store.matches(first)).toBe(false);
    expect(store.matches(second)).toBe(true);
  });

  test("observes token rotation performed by another CLI process", async () => {
    const root = join("/tmp", `klyric-token-reload-${crypto.randomUUID()}`);
    const path = join(root, "publisher-token");
    const runningStore = new PublisherTokenStore(path);
    await runningStore.initialize();
    const first = await runningStore.loadOrCreate();
    const cliStore = new PublisherTokenStore(path);
    const second = await cliStore.rotate();

    expect(await runningStore.matchesActive(first)).toBe(false);
    expect(await runningStore.matchesActive(second)).toBe(true);
  });
});

describe("memory-only state store", () => {
  test("suppresses display duplicates, enforces sequence order, and expires playing state", () => {
    const store = new StateStore();
    const first = { ...validStateFixture, sequence: 1 };
    expect(store.publish(first, 100).kind).toBe("accepted");
    const heartbeat = {
      ...first,
      sequence: 2,
      emittedAt: "2026-07-11T12:00:01.000Z",
    };
    expect(store.publish(heartbeat, 200).kind).toBe("duplicate");
    expect(() => store.publish(heartbeat, 300)).toThrow(
      "sequence must increase",
    );
    expect(store.expire(15_199, 15_000, 86_400_000).kind).toBe("unchanged");
    expect(store.expire(15_200, 15_000, 86_400_000)).toMatchObject({
      kind: "stale",
      state: { stale: true },
    });
  });

  test("removes lines from stopped states and clears only from memory", () => {
    const store = new StateStore();
    const stopped = {
      ...validStateFixture,
      sequence: 1,
      playbackStatus: "stopped" as const,
    };
    expect(store.publish(stopped, 100)).toMatchObject({
      kind: "accepted",
      state: { currentLine: null, hasLyrics: false, lyricsKind: "unavailable" },
    });
    expect(store.clear("manual")).toEqual({
      kind: "cleared",
      reason: "manual",
    });
    expect(store.current()).toBeNull();
  });
});
