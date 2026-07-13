import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PROTOCOL_VERSION,
  validServerMessagesFixture,
  validStateFixture,
} from "../../../packages/protocol/src";

interface ProtocolLibrary {
  parseServerMessage(value: string): Record<string, unknown> | null;
}

interface FormattingLibrary {
  fallbackText(
    state: Record<string, unknown> | null,
    configuration: Record<string, unknown>,
    connectionState: string,
  ): string;
}

function loadProtocolLibrary(): ProtocolLibrary {
  const source = readFileSync(
    resolve(import.meta.dir, "../package/contents/ui/js/Protocol.js"),
    "utf8",
  ).replace(".pragma library", "");
  const createLibrary = new Function(
    `${source}\nreturn { parseServerMessage: parseServerMessage };`,
  ) as () => ProtocolLibrary;
  return createLibrary();
}

function loadFormattingLibrary(): FormattingLibrary {
  const source = readFileSync(
    resolve(import.meta.dir, "../package/contents/ui/js/Formatting.js"),
    "utf8",
  ).replace(".pragma library", "");
  const createLibrary = new Function(
    "i18n",
    "i18np",
    `${source}\nreturn { fallbackText: fallbackText };`,
  ) as (
    i18n: (value: string) => string,
    i18np: (singular: string, plural: string, count: number) => string,
  ) => FormattingLibrary;
  return createLibrary(
    (value) => value,
    (singular, plural, count) => (count === 1 ? singular : plural),
  );
}

test("the QML protocol helper accepts all shared bridge fixtures", () => {
  const protocol = loadProtocolLibrary();

  for (const fixture of validServerMessagesFixture) {
    expect(protocol.parseServerMessage(JSON.stringify(fixture))).toEqual(
      fixture,
    );
  }
});

test("the QML protocol helper accepts optional Cider lyric state fields and legacy states", () => {
  const protocol = loadProtocolLibrary();
  const legacy = { ...validStateFixture } as Record<string, unknown>;
  delete legacy.trackHasLyrics;
  delete legacy.lyricsPanelOpen;

  expect(
    protocol.parseServerMessage(
      JSON.stringify({ type: "state", payload: validStateFixture }),
    )?.payload,
  ).toMatchObject({ trackHasLyrics: true, lyricsPanelOpen: true });
  expect(
    protocol.parseServerMessage(
      JSON.stringify({ type: "state", payload: legacy }),
    ),
  )?.not.toHaveProperty("trackHasLyrics");
  expect(
    protocol.parseServerMessage(
      JSON.stringify({
        type: "state",
        payload: { ...validStateFixture, trackHasLyrics: "true" },
      }),
    ),
  ).toBeNull();
});

test("the QML protocol helper rejects malformed messages and identifies incompatible bridges", () => {
  const protocol = loadProtocolLibrary();
  const invalidTrack = {
    ...validStateFixture,
    track: { title: 42 },
  };

  expect(protocol.parseServerMessage("not json")).toBeNull();
  expect(
    protocol.parseServerMessage(
      JSON.stringify({
        type: "hello",
        protocolVersion: PROTOCOL_VERSION + 1,
        bridgeVersion: "2.0.0",
      }),
    ),
  ).toEqual({ type: "incompatible" });
  expect(
    protocol.parseServerMessage(
      JSON.stringify({ type: "state", payload: invalidTrack }),
    ),
  ).toBeNull();
  expect(
    protocol.parseServerMessage(JSON.stringify({ type: "future-message" })),
  ).toEqual({ type: "unknown" });
});

test("the QML protocol helper accepts Unicode lines within the shared limit", () => {
  const protocol = loadProtocolLibrary();
  const state = {
    ...validStateFixture,
    currentLine: { text: "🎵".repeat(2_000) },
  };

  expect(
    protocol.parseServerMessage(
      JSON.stringify({ type: "state", payload: state }),
    )?.type,
  ).toBe("state");
});

test("the QML formatting helper follows the configured fallback priority", () => {
  const formatting = loadFormattingLibrary();
  const configuration = {
    instrumentalText: "Instrumental",
    noLyricsText: "Lyrics unavailable",
    pausedBehavior: "keep-line",
    showTrackFallback: true,
  };

  expect(
    formatting.fallbackText(validStateFixture, configuration, "connected"),
  ).toBe("Current fixture line");
  expect(
    formatting.fallbackText(
      { ...validStateFixture, lyricsKind: "instrumental", currentLine: null },
      configuration,
      "connected",
    ),
  ).toBe("Instrumental");
  expect(
    formatting.fallbackText(
      { ...validStateFixture, playbackStatus: "paused" },
      { ...configuration, pausedBehavior: "track-fallback" },
      "connected",
    ),
  ).toBe("Fixture title — Fixture artist");
  expect(formatting.fallbackText(null, configuration, "disconnected")).toBe(
    "KLyric bridge unavailable",
  );
});

test("the Plasma runtime wires settings and translations through supported contexts", () => {
  const mainQml = readFileSync(
    resolve(import.meta.dir, "../package/contents/ui/main.qml"),
    "utf8",
  );
  const formattingJs = readFileSync(
    resolve(import.meta.dir, "../package/contents/ui/js/Formatting.js"),
    "utf8",
  );
  const fullRepresentationQml = readFileSync(
    resolve(import.meta.dir, "../package/contents/ui/FullRepresentation.qml"),
    "utf8",
  );

  expect(mainQml).toContain(
    "readonly property var configuration: Plasmoid.configuration",
  );
  expect(mainQml).toContain("onStatusChanged: function(status)");
  expect(mainQml).toContain("onErrorStringChanged: function(errorString)");
  expect(mainQml).toMatch(
    /status === WebSocket\.Closed[\s\S]*socket\.active = false[\s\S]*root\.scheduleReconnect\(\)/,
  );
  expect(mainQml).toContain("verticalPanel: root.verticalPanel");
  expect(formattingJs).not.toContain(".pragma library");
  expect(fullRepresentationQml).not.toContain("Kirigami.Theme.headingFont");
});

test("the compact representation allocates panel-axis length for opt-in vertical text", () => {
  const compactQml = readFileSync(
    resolve(
      import.meta.dir,
      "../package/contents/ui/CompactRepresentation.qml",
    ),
    "utf8",
  );

  expect(compactQml).toContain("property bool verticalPanel: false");
  expect(compactQml).toContain(
    "Layout.preferredHeight: verticalPanel ? preferredPanelLength : implicitHeight",
  );
  expect(compactQml).toContain("rotation: -90");
  expect(compactQml).toContain("visible: !compact.verticalPanel");
  expect(compactQml.match(/fontSizeMode: Text\.VerticalFit/g)).toHaveLength(2);
});
