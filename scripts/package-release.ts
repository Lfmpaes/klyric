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

const releaseScripts = join(staging, "scripts");
await recreateDirectory(releaseScripts);
for (const filename of [
  "install-local.ts",
  "local-installation.ts",
  "release-utils.ts",
  "uninstall-local.ts",
  "verify-environment.ts",
]) {
  await copyFile(
    join(root, "scripts", filename),
    join(releaseScripts, filename),
  );
}
for (const filename of ["LICENSE", "README.md", "RELEASE_NOTES.md"]) {
  await copyFile(join(root, filename), join(staging, filename));
}
await Bun.write(
  join(staging, "package.json"),
  `${JSON.stringify(
    {
      name: "klyric-release",
      version,
      private: true,
      type: "module",
      scripts: {
        "install:local": "bun run scripts/install-local.ts",
        "uninstall:local": "bun run scripts/uninstall-local.ts",
        verify: "bun run scripts/verify-environment.ts",
      },
    },
    null,
    2,
  )}\n`,
);

const artifacts = (await readdir(staging, { withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name);
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
