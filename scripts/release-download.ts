import { mkdir, rm } from "node:fs/promises";
import { basename, join } from "node:path";

const DEFAULT_REPOSITORY = "Lfmpaes/klyric";

interface ReleaseAsset {
  readonly browser_download_url: string;
  readonly name: string;
}

interface LatestRelease {
  readonly assets: readonly ReleaseAsset[];
  readonly tag_name: string;
}

export interface DownloadOptions {
  readonly apiBase?: string;
  readonly repository?: string;
}

async function download(url: string, destination: string): Promise<void> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/octet-stream",
      "User-Agent": "klyric-installer",
    },
    redirect: "follow",
  });
  if (!response.ok)
    throw new Error(`Download failed (${response.status}): ${url}`);
  await Bun.write(destination, response);
}

export async function downloadLatestRelease(
  destination: string,
  options: DownloadOptions = {},
): Promise<string> {
  const repository = options.repository ?? DEFAULT_REPOSITORY;
  const apiBase = options.apiBase ?? "https://api.github.com";
  const response = await fetch(
    `${apiBase}/repos/${repository}/releases/latest`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "klyric-installer",
      },
    },
  );
  if (!response.ok) {
    throw new Error(
      `Could not resolve the latest KLyric release (${response.status}).`,
    );
  }
  const release = (await response.json()) as LatestRelease;
  const version = release.tag_name.replace(/^v/, "");
  const archiveName = `klyric-${version}.tar.gz`;
  const archive = release.assets.find((asset) => asset.name === archiveName);
  const checksums = release.assets.find((asset) => asset.name === "SHA256SUMS");
  if (!archive || !checksums) {
    throw new Error(
      "The latest KLyric release is missing its archive or checksums.",
    );
  }

  await mkdir(destination, { recursive: true });
  const archivePath = join(destination, archiveName);
  const checksumPath = join(destination, "SHA256SUMS");
  await Promise.all([
    download(archive.browser_download_url, archivePath),
    download(checksums.browser_download_url, checksumPath),
  ]);
  const verification = Bun.spawn(
    ["sha256sum", "--check", basename(checksumPath)],
    {
      cwd: destination,
      stderr: "inherit",
      stdout: "inherit",
    },
  );
  if ((await verification.exited) !== 0) {
    await rm(archivePath, { force: true });
    throw new Error("KLyric release checksum verification failed.");
  }
  const extraction = Bun.spawn(["tar", "-xzf", archivePath], {
    cwd: destination,
    stderr: "inherit",
  });
  if ((await extraction.exited) !== 0)
    throw new Error("Could not extract KLyric release.");
  return join(destination, `klyric-${version}`);
}
