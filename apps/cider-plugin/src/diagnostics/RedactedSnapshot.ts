import type { RedactedCapabilityReport } from "../cider/CiderCapabilities";

const SENSITIVE_KEY = /token|secret|cookie|authorization|account|lyric|text/i;

export function createRedactedSnapshot(
  report: RedactedCapabilityReport,
): RedactedCapabilityReport {
  return structuredClone(report);
}

export function redactUnknown(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactUnknown);
  if (typeof value !== "object" || value === null) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[redacted]" : redactUnknown(entry),
    ]),
  );
}
