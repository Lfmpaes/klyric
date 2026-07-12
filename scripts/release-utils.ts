import { mkdir, rm } from "node:fs/promises";
import { dirname } from "node:path";

export async function recreateDirectory(path: string): Promise<void> {
  await rm(path, { force: true, recursive: true });
  await mkdir(path, { recursive: true });
}

export async function copyFile(
  source: string,
  destination: string,
): Promise<void> {
  await mkdir(dirname(destination), { recursive: true });
  await Bun.write(destination, Bun.file(source));
}

export async function run(
  command: readonly string[],
  options: { cwd?: string; env?: Record<string, string | undefined> } = {},
): Promise<void> {
  const child = Bun.spawn(command, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stderr: "inherit",
    stdout: "inherit",
  });
  if ((await child.exited) !== 0) {
    throw new Error(`Command failed: ${command.join(" ")}`);
  }
}
