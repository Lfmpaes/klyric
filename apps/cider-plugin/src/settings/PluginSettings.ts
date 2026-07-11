import type { SourceKind } from "@klyric/protocol";

const SETTINGS_KEY = "dev.luizpaes.klyric.settings.v1";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1"]);

export type SourcePreference = "auto" | Exclude<SourceKind, "none">;

export interface PluginSettings {
  enabled: boolean;
  bridgeHost: string;
  bridgePort: number;
  publisherToken: string;
  sourcePreference: SourcePreference;
  heartbeatIntervalMs: number;
  diagnosticLogging: boolean;
}

export const DEFAULT_PLUGIN_SETTINGS: Readonly<PluginSettings> = {
  enabled: true,
  bridgeHost: "127.0.0.1",
  bridgePort: 37_654,
  publisherToken: "",
  sourcePreference: "auto",
  heartbeatIntervalMs: 5_000,
  diagnosticLogging: false,
};

export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class PluginSettingsStore {
  public constructor(
    private readonly storage: SettingsStorage | undefined = safeStorage(),
  ) {}

  public load(): PluginSettings {
    if (this.storage === undefined) return { ...DEFAULT_PLUGIN_SETTINGS };
    try {
      const raw = this.storage.getItem(SETTINGS_KEY);
      if (raw === null) return { ...DEFAULT_PLUGIN_SETTINGS };
      return normalizeSettings(JSON.parse(raw));
    } catch {
      return { ...DEFAULT_PLUGIN_SETTINGS };
    }
  }

  public save(settings: PluginSettings): PluginSettings {
    const normalized = normalizeSettings(settings);
    this.storage?.setItem(SETTINGS_KEY, JSON.stringify(normalized));
    return normalized;
  }
}

export function normalizeSettings(value: unknown): PluginSettings {
  const record = isRecord(value) ? value : {};
  const bridgeHost = loopbackHost(record.bridgeHost)
    ? record.bridgeHost
    : DEFAULT_PLUGIN_SETTINGS.bridgeHost;
  const bridgePort = validPort(record.bridgePort)
    ? record.bridgePort
    : DEFAULT_PLUGIN_SETTINGS.bridgePort;
  const publisherToken = validToken(record.publisherToken)
    ? record.publisherToken
    : "";
  const sourcePreference = validSourcePreference(record.sourcePreference)
    ? record.sourcePreference
    : DEFAULT_PLUGIN_SETTINGS.sourcePreference;
  const heartbeatIntervalMs = validHeartbeat(record.heartbeatIntervalMs)
    ? record.heartbeatIntervalMs
    : DEFAULT_PLUGIN_SETTINGS.heartbeatIntervalMs;
  return {
    enabled: record.enabled !== false,
    bridgeHost,
    bridgePort,
    publisherToken,
    sourcePreference,
    heartbeatIntervalMs,
    diagnosticLogging: record.diagnosticLogging === true,
  };
}

export function bridgeBaseUrl(
  settings: Pick<PluginSettings, "bridgeHost" | "bridgePort">,
): string {
  const host = settings.bridgeHost.includes(":")
    ? `[${settings.bridgeHost}]`
    : settings.bridgeHost;
  return `http://${host}:${settings.bridgePort}`;
}

function safeStorage(): SettingsStorage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function loopbackHost(value: unknown): value is string {
  return typeof value === "string" && LOOPBACK_HOSTS.has(value);
}

function validPort(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 1 &&
    value <= 65_535
  );
}

function validToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/u.test(value);
}

function validSourcePreference(value: unknown): value is SourcePreference {
  return (
    value === "auto" ||
    value === "public-api" ||
    value === "internal-store" ||
    value === "timeline" ||
    value === "dom"
  );
}

function validHeartbeat(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 1_000 &&
    value <= 60_000
  );
}
