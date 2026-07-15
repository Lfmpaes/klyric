#!/bin/sh
set -eu

REPOSITORY="${KLYRIC_GITHUB_REPOSITORY:-Lfmpaes/klyric}"
API_BASE="${KLYRIC_GITHUB_API_BASE:-https://api.github.com}"

if [ "$(uname -s)" != "Linux" ]; then
  printf '%s\n' "KLyric supports Linux only." >&2
  exit 1
fi

for command in bun curl sha256sum tar unzip kpackagetool6 systemctl; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$command" >&2
    exit 1
  fi
done

workdir="$(mktemp -d "${TMPDIR:-/tmp}/klyric-install.XXXXXX")"
trap 'rm -rf "$workdir"' EXIT HUP INT TERM

release_json="$workdir/release.json"
curl -fsSL \
  -H 'Accept: application/vnd.github+json' \
  -H 'User-Agent: klyric-installer' \
  "$API_BASE/repos/$REPOSITORY/releases/latest" > "$release_json"

tag="$(bun -e 'const value = await Bun.file(process.argv[1]).json(); if (typeof value.tag_name !== "string") process.exit(1); process.stdout.write(value.tag_name)' "$release_json")"
version="${tag#v}"
archive="klyric-$version.tar.gz"
asset_urls="$(bun -e '
const value = await Bun.file(process.argv[1]).json()
const names = [process.argv[2], "SHA256SUMS"]
for (const name of names) {
  const asset = value.assets?.find((candidate) => candidate?.name === name)
  if (typeof asset?.browser_download_url !== "string") process.exit(1)
  console.log(asset.browser_download_url)
}
' "$release_json" "$archive")" || {
  printf '%s\n' "The latest KLyric release is missing its archive or checksums." >&2
  exit 1
}
archive_url="$(printf '%s\n' "$asset_urls" | sed -n '1p')"
checksums_url="$(printf '%s\n' "$asset_urls" | sed -n '2p')"

curl -fsSL "$archive_url" -o "$workdir/$archive"
curl -fsSL "$checksums_url" -o "$workdir/SHA256SUMS"
(
  cd "$workdir"
  sha256sum --check SHA256SUMS
  tar -xzf "$archive"
  bun run "klyric-$version/scripts/install-local.ts" --source "klyric-$version"
)
