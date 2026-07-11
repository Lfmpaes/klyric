import { describe, expect, test } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DEFAULT_BRIDGE_HOST,
  DEFAULT_BRIDGE_PORT,
  isLoopbackHost,
  resolveBridgeConfig,
  validateLoopbackHost,
  validatePort,
} from "../../src/config";

describe("bridge configuration", () => {
  test("uses safe loopback defaults and validates ports", async () => {
    const root = await mkdtemp("klyric-config-");
    const config = await resolveBridgeConfig({
      environment: { XDG_CONFIG_HOME: root },
    });
    expect(config.host).toBe(DEFAULT_BRIDGE_HOST);
    expect(config.port).toBe(DEFAULT_BRIDGE_PORT);
    expect(config.tokenPath).toBe(join(root, "klyric", "publisher-token"));
    expect(isLoopbackHost("127.0.0.1")).toBe(true);
    expect(isLoopbackHost("::1")).toBe(true);
    expect(isLoopbackHost("localhost")).toBe(false);
    expect(() => validateLoopbackHost("0.0.0.0")).toThrow();
    expect(() => validateLoopbackHost("192.168.1.20")).toThrow();
    expect(() => validatePort("0")).toThrow();
    expect(() => validatePort("65536")).toThrow();
  });

  test("applies config, environment, and explicit values in precedence order", async () => {
    const root = await mkdtemp("klyric-config-");
    const directory = join(root, "klyric");
    const path = join(directory, "bridge.json");
    await mkdir(directory, { recursive: true });
    await writeFile(path, JSON.stringify({ host: "::1", port: 37_655 }));

    expect(
      await resolveBridgeConfig({ environment: { XDG_CONFIG_HOME: root } }),
    ).toMatchObject({ host: "::1", port: 37_655 });
    expect(
      await resolveBridgeConfig({
        environment: {
          KLYRIC_BRIDGE_CONFIG: path,
          KLYRIC_BRIDGE_PORT: "37656",
        },
      }),
    ).toMatchObject({ host: "::1", port: 37_656 });
    expect(
      await resolveBridgeConfig({
        configPath: path,
        host: "127.0.0.1",
        port: 37_657,
      }),
    ).toMatchObject({ host: "127.0.0.1", port: 37_657 });
  });
});

async function mkdtemp(prefix: string): Promise<string> {
  const path = join("/tmp", `${prefix}${crypto.randomUUID()}`);
  await mkdir(path, { recursive: true });
  return path;
}
