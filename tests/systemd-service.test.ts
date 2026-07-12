import { expect, test } from "bun:test";

const servicePath = new URL(
  "../packaging/systemd/klyric-bridge.service",
  import.meta.url,
);

test("the packaged bridge unit starts the supported CLI with required hardening", async () => {
  const unit = await Bun.file(servicePath).text();

  expect(unit).toContain("Description=KLyric local lyric bridge");
  expect(unit).toContain("After=graphical-session.target");
  expect(unit).toContain("PartOf=graphical-session.target");
  expect(unit).toContain("Type=simple");
  expect(unit).toContain("ExecStart=%h/.local/bin/klyric-bridge\n");
  expect(unit).not.toContain("klyric-bridge run");
  expect(unit).toContain("Restart=on-failure");
  expect(unit).toContain("RestartSec=2");
  expect(unit).toContain("NoNewPrivileges=yes");
  expect(unit).toContain("PrivateTmp=yes");
  expect(unit).toContain("ProtectSystem=strict");
  expect(unit).toContain("ProtectHome=read-only");
  expect(unit).toContain("ReadWritePaths=%h/.config/klyric");
  expect(unit).toContain("RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX");
  expect(unit).toContain("LockPersonality=yes");
  expect(unit).toContain("WantedBy=default.target");
});
