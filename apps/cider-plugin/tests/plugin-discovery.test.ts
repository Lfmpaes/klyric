import { describe, expect, test } from "bun:test";

const manifestUrl = new URL("../plugin.yml", import.meta.url);

describe("Cider plugin discovery", () => {
  test("ships the manifest and entrypoint required by Cider 3.1.8", async () => {
    const manifest = await Bun.file(manifestUrl).text();

    expect(manifest).toContain("identifier: dev.luizpaes.klyric");
    expect(manifest).toContain("name: KLyric");
    expect(manifest).toContain("version: 0.1.0");
    expect(manifest).toMatch(/entry:\n  plugin\.js:\n    type: main(?:\n|$)/);
  });
});
