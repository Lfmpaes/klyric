import { expect, test } from "bun:test";
import { chmod, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  defaultReleaseSource,
  installLocal,
  localPaths,
  parseInstallOptions,
  parseUninstallOptions,
  uninstallLocal,
  verifyBridgeHealth,
} from "../scripts/local-installation";

test("installer resolves XDG destinations without touching user settings", () => {
  const paths = localPaths({
    HOME: "/home/tester",
    XDG_BIN_HOME: "/tmp/bin",
    XDG_CONFIG_HOME: "/tmp/config",
    XDG_DATA_HOME: "/tmp/data",
    KLYRIC_CIDER_PLUGIN_HOME: "/tmp/cider/plugins",
  });

  expect(paths.bridge).toBe("/tmp/bin/klyric-bridge");
  expect(paths.service).toBe("/tmp/config/systemd/user/klyric-bridge.service");
  expect(paths.ciderPlugin).toBe("/tmp/cider/plugins/dev.luizpaes.klyric");
  expect(paths.plasmoid).toBe("/tmp/data/plasma/plasmoids/dev.luizpaes.klyric");
});

test("installer accepts explicit artifact sources and uninstall accepts only purge", () => {
  expect(parseInstallOptions(["--dry-run"], defaultReleaseSource())).toEqual({
    dryRun: true,
    source: defaultReleaseSource(),
  });
  expect(
    parseInstallOptions(["--source", "dist/release"], defaultReleaseSource())
      .source,
  ).toBe(join(process.cwd(), "dist/release"));
  expect(parseUninstallOptions([])).toBe(false);
  expect(parseUninstallOptions(["--purge"])).toBe(true);
  expect(() => parseUninstallOptions(["--force"])).toThrow();
});

test("install, upgrade-safe removal, and purge work in disposable XDG paths", async () => {
  await run(["bun", "run", "package"]);
  const root = join("/tmp", `klyric-package-test-${crypto.randomUUID()}`);
  const shim = join(root, "bin");
  await mkdir(shim, { recursive: true });
  for (const command of ["systemctl", "kpackagetool6"]) {
    const path = join(shim, command);
    await Bun.write(path, "#!/bin/sh\nexit 0\n");
    await chmod(path, 0o755);
  }
  const previous = { ...process.env };
  Object.assign(process.env, {
    HOME: root,
    KLYRIC_CIDER_PLUGIN_HOME: join(root, "cider", "plugins"),
    KLYRIC_INSTALL_SKIP_HEALTHCHECK: "1",
    PATH: `${shim}:/usr/bin:/bin`,
    XDG_BIN_HOME: join(root, "bin-home"),
    XDG_CONFIG_HOME: join(root, "config"),
    XDG_CURRENT_DESKTOP: "KDE",
    XDG_DATA_HOME: join(root, "data"),
  });
  try {
    const paths = localPaths();
    await installLocal({ dryRun: false, source: defaultReleaseSource() });
    expect(await Bun.file(paths.bridge).exists()).toBe(true);
    expect(await Bun.file(join(paths.ciderPlugin, "plugin.js")).exists()).toBe(
      true,
    );
    const tokenPath = join(paths.configHome, "klyric", "publisher-token");
    expect(await Bun.file(tokenPath).exists()).toBe(true);
    const tokenBeforeUpgrade = await Bun.file(tokenPath).text();
    await installLocal({ dryRun: false, source: defaultReleaseSource() });
    expect(await Bun.file(tokenPath).text()).toBe(tokenBeforeUpgrade);
    expect(await readFile(paths.service, "utf8")).toContain(
      `ExecStart=${paths.bridge}`,
    );
    await uninstallLocal(false);
    expect(await Bun.file(paths.bridge).exists()).toBe(false);
    expect(await Bun.file(tokenPath).exists()).toBe(true);
    await uninstallLocal(true);
    expect(await Bun.file(join(paths.configHome, "klyric")).exists()).toBe(
      false,
    );
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in previous)) delete process.env[key];
    }
    Object.assign(process.env, previous);
  }
});

test("post-install health check accepts a running loopback bridge", async () => {
  const server = Bun.serve({
    port: 0,
    fetch() {
      return new Response(null, { status: 204 });
    },
  });
  try {
    await verifyBridgeHealth(`http://127.0.0.1:${server.port}/health`);
  } finally {
    server.stop(true);
  }
});

async function run(command: readonly string[]): Promise<void> {
  const child = Bun.spawn(command, { stderr: "inherit", stdout: "inherit" });
  if ((await child.exited) !== 0)
    throw new Error(`Command failed: ${command.join(" ")}`);
}
