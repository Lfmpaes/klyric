const REQUIRED_COMMANDS = ["kpackagetool6", "systemctl", "unzip"] as const;

export interface EnvironmentCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly detail: string;
}

export function checkEnvironment(): readonly EnvironmentCheck[] {
  const checks = REQUIRED_COMMANDS.map((command) => ({
    name: command,
    passed: Bun.which(command) !== null,
    detail: Bun.which(command) === null ? "not found" : "available",
  }));
  checks.push({
    name: "Linux",
    passed: process.platform === "linux",
    detail: process.platform,
  });
  checks.push({
    name: "Plasma session",
    passed: Boolean(process.env.XDG_CURRENT_DESKTOP?.includes("KDE")),
    detail: process.env.XDG_CURRENT_DESKTOP ?? "not detected",
  });
  return checks;
}

export function assertSupportedEnvironment(): void {
  const failures = checkEnvironment().filter((check) => !check.passed);
  if (failures.length > 0) {
    throw new Error(
      `Unsupported installation environment: ${failures.map((check) => check.name).join(", ")}.`,
    );
  }
}

if (import.meta.main) {
  const checks = checkEnvironment();
  for (const check of checks) {
    console.info(
      `${check.passed ? "PASS" : "FAIL"} ${check.name}: ${check.detail}`,
    );
  }
  if (checks.some((check) => !check.passed)) process.exitCode = 1;
}
