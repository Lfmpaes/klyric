import {
  inspectCiderCapabilities,
  type RedactedCapabilityReport,
} from "../cider/CiderCapabilities";
import { createRedactedSnapshot } from "./RedactedSnapshot";

export function runCapabilityInspection(
  root: unknown = globalThis,
  documentRoot: Document | undefined = typeof document === "undefined"
    ? undefined
    : document,
): RedactedCapabilityReport {
  return createRedactedSnapshot(inspectCiderCapabilities(root, documentRoot));
}
