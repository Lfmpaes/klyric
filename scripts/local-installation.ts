import { access, chmod, cp, mkdir, rename, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { copyFile, run } from "./release-utils";
import { assertSupportedEnvironment } from "./verify-environment";

const PLASMOID_ID = "dev.luizpaes.klyric";
const RELEASE_VERSION = (
  await Bun.file(join(import.meta.dir, "../package.json")).json()
).version as string;

export interface LocalPaths {
  readonly binHome: string;
  readonly bridge: string;
  readonly ciderPlugin: string;
  readonly cli: string;
  readonly configHome: string;
  readonly dataHome: string;
  readonly managedRoot: string;
  readonly plasmoid: string;
  readonly service: string;
}

export function localPaths(environment = process.env): LocalPaths {
  const home = environment.HOME ?? homedir();
  const configHome = environment.XDG_CONFIG_HOME ?? join(home, ".config");
  const dataHome = environment.XDG_DATA_HOME ?? join(home, ".local", "share");
  const binHome = environment.XDG_BIN_HOME ?? join(home, ".local", "bin");
  const ciderHome =
    environment.KLYRIC_CIDER_PLUGIN_HOME ??
    join(configHome, "sh.cider.genten", "plugins");
  const managedRoot = join(dataHome, "klyric", "installer");
  return {
    binHome,
    bridge: join(binHome, "klyric-bridge"),
    ciderPlugin: join(ciderHome, PLASMOID_ID),
    cli: join(binHome, "klyric"),
    configHome,
    dataHome,
    managedRoot,
    plasmoid: join(dataHome, "plasma", "plasmoids", PLASMOID_ID),
    service: join(configHome, "systemd", "user", "klyric-bridge.service"),
  };
}

export interface InstallOptions {
  readonly dryRun: boolean;
  readonly source: string;
}

export function parseInstallOptions(
  arguments_: readonly string[],
  defaultSource: string,
): InstallOptions {
  let source = defaultSource;
  let dryRun = false;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--source") {
      source = arguments_[++index] ?? "";
    } else if (argument === "--dry-run") {
      dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return { dryRun, source: resolve(source) };
}

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function backup(path: string, destination: string): Promise<void> {
  if (await exists(path)) await cp(path, destination, { recursive: true });
}

async function replaceExecutable(
  source: string,
  destination: string,
): Promise<void> {
  const temporary = `${destination}.new-${process.pid}`;
  try {
    await copyFile(source, temporary);
    await chmod(temporary, 0o755);
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function installLocal(options: InstallOptions): Promise<void> {
  const paths = localPaths();
  const required = [
    "klyric-bridge",
    "klyric-bridge.service",
    "install.sh",
    "package.json",
    "scripts/klyric.ts",
    "scripts/local-installation.ts",
    "scripts/release-download.ts",
    "scripts/release-utils.ts",
    "scripts/verify-environment.ts",
    `klyric-cider-plugin-${RELEASE_VERSION}.zip`,
    `klyric-plasmoid-${RELEASE_VERSION}.plasmoid`,
  ];
  for (const filename of required) {
    if (!(await exists(join(options.source, filename)))) {
      throw new Error(`Release artifact is missing: ${filename}`);
    }
  }
  if (options.dryRun) {
    console.info(`Validated release artifacts in ${options.source}.`);
    return;
  }
  assertSupportedEnvironment();

  const backupRoot = join(
    paths.dataHome,
    "klyric",
    "backups",
    new Date().toISOString().replaceAll(":", "-"),
  );
  await mkdir(backupRoot, { recursive: true });
  await Promise.all([
    backup(paths.bridge, join(backupRoot, "klyric-bridge")),
    backup(paths.service, join(backupRoot, "klyric-bridge.service")),
    backup(paths.ciderPlugin, join(backupRoot, "cider-plugin")),
    backup(paths.plasmoid, join(backupRoot, "plasmoid")),
  ]);

  await replaceExecutable(join(options.source, "klyric-bridge"), paths.bridge);
  await rm(paths.managedRoot, { force: true, recursive: true });
  await mkdir(paths.managedRoot, { recursive: true });
  await cp(
    join(options.source, "scripts"),
    join(paths.managedRoot, "scripts"),
    {
      recursive: true,
    },
  );
  await copyFile(
    join(options.source, "package.json"),
    join(paths.managedRoot, "package.json"),
  );
  await copyFile(
    join(options.source, "install.sh"),
    join(paths.managedRoot, "install.sh"),
  );
  await Bun.write(
    paths.cli,
    `#!/bin/sh\nexec bun "${join(paths.managedRoot, "scripts", "klyric.ts")}" "$@"\n`,
  );
  await chmod(paths.cli, 0o755);
  const unit = (
    await Bun.file(join(options.source, "klyric-bridge.service")).text()
  ).replace("%h/.local/bin/klyric-bridge", paths.bridge);
  await mkdir(join(paths.configHome, "systemd", "user"), { recursive: true });
  await Bun.write(paths.service, unit);
  await rm(paths.ciderPlugin, { force: true, recursive: true });
  await mkdir(paths.ciderPlugin, { recursive: true });
  await run(
    [
      "unzip",
      "-q",
      "-o",
      join(options.source, `klyric-cider-plugin-${RELEASE_VERSION}.zip`),
      "-d",
      paths.ciderPlugin,
    ],
    { cwd: options.source },
  );
  await run([
    "kpackagetool6",
    "--type",
    "Plasma/Applet",
    "--upgrade",
    join(options.source, `klyric-plasmoid-${RELEASE_VERSION}.plasmoid`),
  ]);
  await run(["systemctl", "--user", "daemon-reload"]);
  await run(["systemctl", "--user", "enable", "klyric-bridge.service"]);
  await run(["systemctl", "--user", "restart", "klyric-bridge.service"]);
  if (process.env.KLYRIC_INSTALL_SKIP_HEALTHCHECK !== "1") {
    await verifyBridgeHealth();
  }
  const tokenCreation = Bun.spawn([paths.bridge, "token", "show"], {
    env: process.env,
    stderr: "inherit",
    stdout: "ignore",
  });
  if ((await tokenCreation.exited) !== 0) {
    throw new Error("Could not generate or confirm the publisher token.");
  }
  console.info(
    "KLyric is installed. Configure Cider with the bridge token, then add the widget from the Plasma panel menu.",
  );
}

export async function verifyBridgeHealth(
  url = "http://127.0.0.1:37654/health",
): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The user service may still be starting.
    }
    await Bun.sleep(250);
  }
  throw new Error("KLyric bridge did not pass its post-install health check.");
}

export async function uninstallLocal(purge: boolean): Promise<void> {
  const paths = localPaths();
  await run([
    "systemctl",
    "--user",
    "disable",
    "--now",
    "klyric-bridge.service",
  ]);
  await rm(paths.service, { force: true });
  await run(["systemctl", "--user", "daemon-reload"]);
  await run([
    "kpackagetool6",
    "--type",
    "Plasma/Applet",
    "--remove",
    PLASMOID_ID,
  ]);
  await rm(paths.bridge, { force: true });
  await rm(paths.ciderPlugin, { force: true, recursive: true });
  await rm(paths.cli, { force: true });
  await rm(paths.managedRoot, { force: true, recursive: true });
  if (purge)
    await rm(join(paths.configHome, "klyric"), {
      force: true,
      recursive: true,
    });
  console.info(
    purge
      ? "KLyric was uninstalled and its settings were purged."
      : "KLyric was uninstalled. Settings were preserved.",
  );
}

export function defaultReleaseSource(): string {
  const root = resolve(import.meta.dir, "..");
  return join(root, "dist", "release", `klyric-${RELEASE_VERSION}`);
}

export function parseUninstallOptions(arguments_: readonly string[]): boolean {
  if (arguments_.length === 0) return false;
  if (arguments_.length === 1 && arguments_[0] === "--purge") return true;
  throw new Error(`Unknown argument: ${arguments_.join(" ")}`);
}
