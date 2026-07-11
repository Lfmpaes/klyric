import { PROTOCOL_VERSION, type SourceKind } from "@klyric/protocol";
import type { PluginPhase } from "../application/PluginStateMachine";
import type { RedactedCapabilityReport } from "../cider/CiderCapabilities";

export interface RedactedDiagnostics {
  pluginVersion: string;
  protocolVersion: number;
  phase: PluginPhase;
  sourceKind: SourceKind;
  bridgeConnected: boolean;
  lastPublicationAt: string | null;
  lastError: string | null;
  capabilities: RedactedCapabilityReport;
}

export class Diagnostics {
  private phase: PluginPhase = "initializing";
  private sourceKind: SourceKind = "none";
  private bridgeConnected = false;
  private lastPublicationAt: string | null = null;
  private lastError: string | null = null;

  public constructor(
    private readonly pluginVersion: string,
    private readonly capabilities: RedactedCapabilityReport,
  ) {}

  public setState(phase: PluginPhase, sourceKind: SourceKind): void {
    this.phase = phase;
    this.sourceKind = sourceKind;
  }

  public setBridgeConnected(connected: boolean): void {
    this.bridgeConnected = connected;
    if (connected) this.lastPublicationAt = new Date().toISOString();
  }

  public recordError(error: Error): void {
    this.lastError = error.name.slice(0, 64);
  }

  public snapshot(): RedactedDiagnostics {
    return {
      pluginVersion: this.pluginVersion,
      protocolVersion: PROTOCOL_VERSION,
      phase: this.phase,
      sourceKind: this.sourceKind,
      bridgeConnected: this.bridgeConnected,
      lastPublicationAt: this.lastPublicationAt,
      lastError: this.lastError,
      capabilities: structuredClone(this.capabilities),
    };
  }
}
