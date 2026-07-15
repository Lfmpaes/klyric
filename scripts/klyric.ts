import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  installLocal,
  parseUninstallOptions,
  uninstallLocal,
} from "./local-installation";
import { downloadLatestRelease } from "./release-download";

const VERSION = (
  await Bun.file(join(import.meta.dir, "../package.json")).json()
).version as string;

function usage(): string {
  return `KLyric ${VERSION}\n\nUsage:\n  klyric update\n  klyric uninstall [--purge]\n  klyric version\n  klyric help`;
}

async function update(): Promise<void> {
  const temporary = await mkdtemp(join(tmpdir(), "klyric-update-"));
  try {
    const source = await downloadLatestRelease(temporary, {
      apiBase: process.env.KLYRIC_GITHUB_API_BASE,
      repository: process.env.KLYRIC_GITHUB_REPOSITORY,
    });
    await installLocal({ dryRun: false, source });
  } finally {
    await rm(temporary, { force: true, recursive: true });
  }
}

async function main(): Promise<void> {
  const [command = "help", ...arguments_] = Bun.argv.slice(2);
  if (command === "update") await update();
  else if (command === "uninstall")
    await uninstallLocal(parseUninstallOptions(arguments_));
  else if (command === "version") console.info(VERSION);
  else if (command === "help" || command === "--help" || command === "-h")
    console.info(usage());
  else throw new Error(`Unknown command: ${command}\n\n${usage()}`);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
