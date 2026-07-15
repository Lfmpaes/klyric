import { expect, test } from "bun:test";
import { chmod, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  defaultReleaseSource,
  installLocal,
  localPaths,
  parseInstallOptions,
  parseUninstallOptions,
  uninstallLocal,
  verifyBridgeHealth,
} from "../scripts/local-installation";
import { downloadLatestRelease } from "../scripts/release-download";

const VERSION = (await Bun.file("package.json").json()).version as string;

let releaseQueue: Promise<void> = Promise.resolve();

function withReleaseLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = releaseQueue;
  let release: (() => void) | undefined;
  releaseQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  return previous.then(operation).finally(() => release?.());
}

function serveOnAvailablePort(
  fetch: (request: Request) => Response | Promise<Response>,
): ReturnType<typeof Bun.serve> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      return Bun.serve({
        hostname: "127.0.0.1",
        port: 40_000 + Math.floor(Math.random() * 20_000),
        fetch,
      });
    } catch (error) {
      if (attempt === 19) throw error;
    }
  }
  throw new Error("Could not allocate a loopback test port.");
}

test("installer resolves XDG destinations without touching user settings", () => {
  const paths = localPaths({
    HOME: "/home/tester",
    XDG_BIN_HOME: "/tmp/bin",
    XDG_CONFIG_HOME: "/tmp/config",
    XDG_DATA_HOME: "/tmp/data",
    KLYRIC_CIDER_PLUGIN_HOME: "/tmp/cider/plugins",
  });

  expect(paths.bridge).toBe("/tmp/bin/klyric-bridge");
  expect(paths.cli).toBe("/tmp/bin/klyric");
  expect(paths.managedRoot).toBe("/tmp/data/klyric/installer");
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

test("management CLI reports invalid commands without a stack trace", async () => {
  const child = Bun.spawn(
    [process.execPath, "run", "scripts/klyric.ts", "nope"],
    {
      stderr: "pipe",
      stdout: "pipe",
    },
  );
  const stderr = await new Response(child.stderr).text();
  expect(await child.exited).toBe(1);
  expect(stderr).toContain("Unknown command: nope");
  expect(stderr).toContain("klyric update");
  expect(stderr).not.toContain("at main");
});

test(
  "install, upgrade-safe removal, and purge work in disposable XDG paths",
  () =>
    withReleaseLock(async () => {
      await run(["bun", "run", "package"]);
      const root = join("/tmp", `klyric-package-test-${crypto.randomUUID()}`);
      const shim = join(root, "bin");
      await mkdir(shim, { recursive: true });
      for (const command of ["systemctl", "kpackagetool6"]) {
        const path = join(shim, command);
        await Bun.write(
          path,
          command === "systemctl"
            ? `#!/bin/sh\nprintf '%s\\n' "$*" >> "${join(root, "systemctl.log")}"\nexit 0\n`
            : "#!/bin/sh\nexit 0\n",
        );
        await chmod(path, 0o755);
      }
      const previous = { ...process.env };
      Object.assign(process.env, {
        HOME: root,
        KLYRIC_CIDER_PLUGIN_HOME: join(root, "cider", "plugins"),
        KLYRIC_INSTALL_SKIP_HEALTHCHECK: "1",
        PATH: `${dirname(process.execPath)}:${shim}:/usr/bin:/bin`,
        XDG_BIN_HOME: join(root, "bin-home"),
        XDG_CONFIG_HOME: join(root, "config"),
        XDG_CURRENT_DESKTOP: "KDE",
        XDG_DATA_HOME: join(root, "data"),
      });
      try {
        const paths = localPaths();
        await installLocal({ dryRun: false, source: defaultReleaseSource() });
        expect(await Bun.file(paths.bridge).exists()).toBe(true);
        expect(await Bun.file(paths.cli).exists()).toBe(true);
        expect(
          await Bun.file(
            join(paths.managedRoot, "scripts", "klyric.ts"),
          ).exists(),
        ).toBe(true);
        expect(
          await Bun.file(join(paths.ciderPlugin, "plugin.js")).exists(),
        ).toBe(true);
        const tokenPath = join(paths.configHome, "klyric", "publisher-token");
        expect(await Bun.file(tokenPath).exists()).toBe(true);
        const serviceCalls = await Bun.file(join(root, "systemctl.log")).text();
        expect(serviceCalls).toContain("--user enable klyric-bridge.service");
        expect(serviceCalls).toContain("--user restart klyric-bridge.service");
        const version = Bun.spawn([paths.cli, "version"], {
          env: process.env,
          stdout: "pipe",
        });
        expect((await new Response(version.stdout).text()).trim()).toBe(
          VERSION,
        );
        expect(await version.exited).toBe(0);
        const help = Bun.spawn([paths.cli, "help"], {
          env: process.env,
          stdout: "pipe",
        });
        expect(await new Response(help.stdout).text()).toContain(
          "klyric uninstall [--purge]",
        );
        expect(await help.exited).toBe(0);
        const tokenBeforeUpgrade = await Bun.file(tokenPath).text();
        const runningBridge = Bun.spawn(
          [
            paths.bridge,
            "--port",
            String(40_000 + Math.floor(Math.random() * 20_000)),
          ],
          {
            env: process.env,
            stderr: "ignore",
            stdout: "ignore",
          },
        );
        try {
          await Bun.sleep(100);
          await installLocal({ dryRun: false, source: defaultReleaseSource() });
        } finally {
          runningBridge.kill();
          await runningBridge.exited;
        }
        expect(await Bun.file(tokenPath).text()).toBe(tokenBeforeUpgrade);
        expect(await readFile(paths.service, "utf8")).toContain(
          `ExecStart=${paths.bridge}`,
        );
        const uninstall = Bun.spawn([paths.cli, "uninstall"], {
          env: process.env,
          stderr: "inherit",
          stdout: "pipe",
        });
        expect(await new Response(uninstall.stdout).text()).toContain(
          "Settings were preserved",
        );
        expect(await uninstall.exited).toBe(0);
        expect(await Bun.file(paths.bridge).exists()).toBe(false);
        expect(await Bun.file(paths.cli).exists()).toBe(false);
        expect(await Bun.file(paths.managedRoot).exists()).toBe(false);
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
    }),
  20_000,
);

test("post-install health check accepts a running loopback bridge", async () => {
  const server = serveOnAvailablePort(() => {
    return new Response(null, { status: 204 });
  });
  try {
    await verifyBridgeHealth(`http://127.0.0.1:${server.port}/health`);
  } finally {
    server.stop(true);
  }
});

test("release downloader uses API-provided assets and verifies checksums", async () => {
  const root = join("/tmp", `klyric-download-test-${crypto.randomUUID()}`);
  const source = join(root, `klyric-${VERSION}`);
  const archive = join(root, `klyric-${VERSION}.tar.gz`);
  await mkdir(source, { recursive: true });
  await Bun.write(join(source, "marker.txt"), "verified\n");
  await run(["tar", "-C", root, "-czf", archive, `klyric-${VERSION}`]);
  const digest = new Bun.CryptoHasher("sha256")
    .update(await Bun.file(archive).arrayBuffer())
    .digest("hex");
  const checksums = `${digest}  klyric-${VERSION}.tar.gz\n`;
  let server: ReturnType<typeof Bun.serve>;
  server = serveOnAvailablePort((request) => {
    const path = new URL(request.url).pathname;
    const base = `http://127.0.0.1:${server.port}`;
    if (path === "/repos/test/klyric/releases/latest")
      return Response.json({
        tag_name: `v${VERSION}`,
        assets: [
          {
            name: `klyric-${VERSION}.tar.gz`,
            browser_download_url: `${base}/assets/archive`,
          },
          {
            name: "SHA256SUMS",
            browser_download_url: `${base}/assets/checksums`,
          },
        ],
      });
    if (path === "/assets/archive") return new Response(Bun.file(archive));
    if (path === "/assets/checksums") return new Response(checksums);
    return new Response(null, { status: 404 });
  });
  try {
    const destination = join(root, "download");
    const extracted = await downloadLatestRelease(destination, {
      apiBase: `http://127.0.0.1:${server.port}`,
      repository: "test/klyric",
    });
    expect(await Bun.file(join(extracted, "marker.txt")).text()).toBe(
      "verified\n",
    );
  } finally {
    server.stop(true);
    await rm(root, { force: true, recursive: true });
  }
});

test(
  "release packages carry the MIT license for every installable component",
  () =>
    withReleaseLock(async () => {
      await run(["bun", "run", "package"]);
      const release = defaultReleaseSource();
      const expected = await Bun.file("LICENSE").text();
      const plugin = Bun.spawn(
        [
          "unzip",
          "-p",
          join(release, `klyric-cider-plugin-${VERSION}.zip`),
          "LICENSE",
        ],
        { stdout: "pipe" },
      );
      const plasmoid = Bun.spawn(
        [
          "unzip",
          "-p",
          join(release, `klyric-plasmoid-${VERSION}.plasmoid`),
          "LICENSE",
        ],
        { stdout: "pipe" },
      );
      expect(await new Response(plugin.stdout).text()).toBe(expected);
      expect(await new Response(plasmoid.stdout).text()).toBe(expected);
      expect(await plugin.exited).toBe(0);
      expect(await plasmoid.exited).toBe(0);
    }),
  20_000,
);

test(
  "the combined archive installs from a clean extracted target",
  () =>
    withReleaseLock(async () => {
      await run(["bun", "run", "package"]);
      const root = join("/tmp", `klyric-release-test-${crypto.randomUUID()}`);
      const shim = join(root, "bin");
      const releaseRoot = join(root, `klyric-${VERSION}`);
      await mkdir(shim, { recursive: true });
      for (const command of ["systemctl", "kpackagetool6"]) {
        const path = join(shim, command);
        await Bun.write(path, "#!/bin/sh\nexit 0\n");
        await chmod(path, 0o755);
      }
      try {
        await run([
          "tar",
          "-C",
          root,
          "-xzf",
          join(process.cwd(), `dist/release/klyric-${VERSION}.tar.gz`),
        ]);
        const installed = Bun.spawn(
          [process.execPath, "run", "install:local", "--source", "."],
          {
            cwd: releaseRoot,
            env: {
              ...process.env,
              HOME: root,
              KLYRIC_CIDER_PLUGIN_HOME: join(root, "cider", "plugins"),
              KLYRIC_INSTALL_SKIP_HEALTHCHECK: "1",
              PATH: `${dirname(process.execPath)}:${shim}:/usr/bin:/bin`,
              XDG_BIN_HOME: join(root, "bin-home"),
              XDG_CONFIG_HOME: join(root, "config"),
              XDG_CURRENT_DESKTOP: "KDE",
              XDG_DATA_HOME: join(root, "data"),
            },
            stderr: "inherit",
            stdout: "inherit",
          },
        );
        expect(await installed.exited).toBe(0);
        expect(
          await Bun.file(join(root, "bin-home", "klyric-bridge")).exists(),
        ).toBe(true);
        expect(
          await Bun.file(
            join(root, "cider", "plugins", "dev.luizpaes.klyric", "plugin.js"),
          ).exists(),
        ).toBe(true);
      } finally {
        await rm(root, { force: true, recursive: true });
      }
    }),
  20_000,
);

async function run(command: readonly string[]): Promise<void> {
  const child = Bun.spawn(command, { stderr: "inherit", stdout: "inherit" });
  if ((await child.exited) !== 0)
    throw new Error(`Command failed: ${command.join(" ")}`);
}
