import { expect, test } from "bun:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { validStateFixture } from "@klyric/protocol";

async function waitForHealth(url: string): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // The child is still starting.
    }
    await Bun.sleep(50);
  }
  throw new Error("Spawned bridge did not become healthy.");
}

test("the CLI process serves an authenticated publication lifecycle and shuts down", async () => {
  const root = join("/tmp", `klyric-bridge-process-${crypto.randomUUID()}`);
  const configDirectory = join(root, "klyric");
  const configPath = join(configDirectory, "bridge.json");
  const port = 40_000 + Math.floor(Math.random() * 20_000);
  await mkdir(configDirectory, { recursive: true });
  await writeFile(configPath, JSON.stringify({ host: "127.0.0.1", port }));

  const child = Bun.spawn({
    cmd: [process.execPath, "run", "src/index.ts", "--config", configPath],
    cwd: join(process.cwd(), "apps", "bridge"),
    stderr: "pipe",
    stdout: "pipe",
  });
  try {
    const baseUrl = `http://127.0.0.1:${port}`;
    await waitForHealth(`${baseUrl}/health`);
    const token = (
      await readFile(join(configDirectory, "publisher-token"), "utf8")
    ).trim();
    const state = {
      ...validStateFixture,
      sequence: 1,
      emittedAt: new Date().toISOString(),
    };
    const response = await fetch(`${baseUrl}/v1/state`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(state),
    });
    expect(response.status).toBe(202);
    expect(await (await fetch(`${baseUrl}/health`)).json()).toMatchObject({
      publisherSeen: true,
      stateAvailable: true,
    });
  } finally {
    child.kill("SIGTERM");
    await child.exited;
  }
});
