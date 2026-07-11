import { access, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const DEFAULT_BRIDGE_HOST = "127.0.0.1";
export const DEFAULT_BRIDGE_PORT = 37_654;
export const DEFAULT_MAX_CLIENTS = 8;
export const DEFAULT_PLAYING_STATE_TTL_MS = 15_000;
export const DEFAULT_PAUSED_STATE_TTL_MS = 24 * 60 * 60 * 1_000;
export const DEFAULT_CLIENT_HELLO_TIMEOUT_MS = 5_000;
export const DEFAULT_CLIENT_PING_INTERVAL_MS = 30_000;
export const DEFAULT_CLIENT_PONG_TIMEOUT_MS = 10_000;

export interface BridgeConfig {
  readonly host: string;
  readonly port: number;
  readonly configPath: string;
  readonly configDirectory: string;
  readonly tokenPath: string;
  readonly maxClients: number;
  readonly playingStateTtlMs: number;
  readonly pausedStateTtlMs: number;
  readonly clientHelloTimeoutMs: number;
  readonly clientPingIntervalMs: number;
  readonly clientPongTimeoutMs: number;
}

export interface BridgeConfigOptions {
  readonly host?: string;
  readonly port?: string | number;
  readonly configPath?: string;
  readonly environment?: NodeJS.ProcessEnv;
}

interface BridgeConfigFile {
  readonly host?: unknown;
  readonly port?: unknown;
}

function configDirectoryFor(environment: NodeJS.ProcessEnv): string {
  return join(
    environment.XDG_CONFIG_HOME ?? join(homedir(), ".config"),
    "klyric",
  );
}

function defaultConfigPath(environment: NodeJS.ProcessEnv): string {
  return join(configDirectoryFor(environment), "bridge.json");
}

export function isLoopbackHost(host: string): boolean {
  return host === "127.0.0.1" || host === "::1";
}

export function validateLoopbackHost(value: unknown): string {
  if (typeof value !== "string" || !isLoopbackHost(value)) {
    throw new Error(
      "Bridge host must be the loopback address 127.0.0.1 or ::1.",
    );
  }

  return value;
}

export function validatePort(value: unknown): number {
  const port =
    typeof value === "string" && /^\d+$/u.test(value) ? Number(value) : value;
  if (
    typeof port !== "number" ||
    !Number.isSafeInteger(port) ||
    port < 1 ||
    port > 65_535
  ) {
    throw new Error("Bridge port must be an integer from 1 through 65535.");
  }

  return port;
}

async function loadConfigFile(path: string): Promise<BridgeConfigFile> {
  try {
    await access(path);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }

  let value: unknown;
  try {
    value = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(
      `Bridge config at ${path} must contain valid JSON: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Bridge config at ${path} must be a JSON object.`);
  }

  return value as BridgeConfigFile;
}

/** Resolves defaults, a JSON config file, environment values, and explicit CLI values. */
export async function resolveBridgeConfig(
  options: BridgeConfigOptions = {},
): Promise<BridgeConfig> {
  const environment = options.environment ?? process.env;
  const configPath = resolve(
    options.configPath ??
      environment.KLYRIC_BRIDGE_CONFIG ??
      defaultConfigPath(environment),
  );
  const file = await loadConfigFile(configPath);
  const host = validateLoopbackHost(
    options.host ??
      environment.KLYRIC_BRIDGE_HOST ??
      file.host ??
      DEFAULT_BRIDGE_HOST,
  );
  const port = validatePort(
    options.port ??
      environment.KLYRIC_BRIDGE_PORT ??
      file.port ??
      DEFAULT_BRIDGE_PORT,
  );
  const configDirectory = dirname(configPath);

  return {
    host,
    port,
    configPath,
    configDirectory,
    tokenPath: join(configDirectory, "publisher-token"),
    maxClients: DEFAULT_MAX_CLIENTS,
    playingStateTtlMs: DEFAULT_PLAYING_STATE_TTL_MS,
    pausedStateTtlMs: DEFAULT_PAUSED_STATE_TTL_MS,
    clientHelloTimeoutMs: DEFAULT_CLIENT_HELLO_TIMEOUT_MS,
    clientPingIntervalMs: DEFAULT_CLIENT_PING_INTERVAL_MS,
    clientPongTimeoutMs: DEFAULT_CLIENT_PONG_TIMEOUT_MS,
  };
}
