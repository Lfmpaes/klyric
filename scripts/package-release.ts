import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { copyFile, recreateDirectory, run } from "./release-utils";

const root = resolve(import.meta.dir, "..");
const version = (await Bun.file(join(root, "package.json")).json())
  .version as string;
const artifactName = `klyric-${version}`;
const releaseRoot = join(root, "dist", "release");
const staging = join(releaseRoot, artifactName);

await recreateDirectory(staging);
await run(["bun", "run", "--cwd", "apps/cider-plugin", "build"], { cwd: root });
await run(
  [
    "bun",
    "build",
    "--compile",
    "apps/bridge/src/index.ts",
    "--outfile",
    join(staging, "klyric-bridge"),
  ],
  { cwd: root },
);

const pluginStaging = join(staging, "cider-plugin");
await recreateDirectory(pluginStaging);
for (const filename of ["plugin.js", "plugin.yml"]) {
  await copyFile(
    join(root, "apps/cider-plugin/dist", filename),
    join(pluginStaging, filename),
  );
}
for (const filename of ["README.md", "LICENSE"]) {
  await copyFile(join(root, filename), join(pluginStaging, filename));
}
await run(
  ["zip", "-q", "-r", join(staging, `klyric-cider-plugin-${version}.zip`), "."],
  { cwd: pluginStaging },
);

const plasmoidSource = join(root, "apps/plasmoid/package");
await run(
  [
    "zip",
    "-q",
    "-r",
    join(staging, `klyric-plasmoid-${version}.plasmoid`),
    ".",
  ],
  { cwd: plasmoidSource },
);
await copyFile(
  join(root, "packaging/systemd/klyric-bridge.service"),
  join(staging, "klyric-bridge.service"),
);

const artifacts = (await readdir(staging)).filter(
  (filename) => filename !== "cider-plugin",
);
const checksums = Bun.spawn(["sha256sum", ...artifacts], {
  cwd: staging,
  stdout: "pipe",
});
if ((await checksums.exited) !== 0)
  throw new Error("Could not create checksums.");
await Bun.write(
  join(staging, "SHA256SUMS"),
  await new Response(checksums.stdout).text(),
);

const archive = join(releaseRoot, `${artifactName}.tar.gz`);
await run(["tar", "-C", releaseRoot, "-czf", archive, artifactName]);
const archiveChecksum = Bun.spawn(["sha256sum", `${artifactName}.tar.gz`], {
  cwd: releaseRoot,
  stdout: "pipe",
});
if ((await archiveChecksum.exited) !== 0) {
  throw new Error("Could not checksum the release archive.");
}
await Bun.write(
  join(releaseRoot, "SHA256SUMS"),
  await new Response(archiveChecksum.stdout).text(),
);

console.info(`Created release artifacts in ${releaseRoot}.`);
