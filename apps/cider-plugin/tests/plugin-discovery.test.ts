import { describe, expect, test } from "bun:test";

const manifestUrl = new URL("../plugin.yml", import.meta.url);

describe("Cider plugin discovery", () => {
  test("ships the manifest and entrypoint required by Cider 3.1.8", async () => {
    const manifest = await Bun.file(manifestUrl).text();

    const packageVersion = (
      await Bun.file(new URL("../package.json", import.meta.url)).json()
    ).version as string;

    expect(manifest).toContain("identifier: dev.luizpaes.klyric");
    expect(manifest).toContain("name: KLyric");
    expect(manifest).toContain(`version: ${packageVersion}`);
    expect(manifest).toMatch(/entry:\n {2}plugin\.js:\n {4}type: main(?:\n|$)/);
  });
});
