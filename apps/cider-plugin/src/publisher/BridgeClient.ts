import type { KLyricState } from "@klyric/protocol";
import { bridgeBaseUrl, type PluginSettings } from "../settings/PluginSettings";

export type BridgeFailureKind =
  | "authentication"
  | "network"
  | "server"
  | "validation";

export class BridgeClientError extends Error {
  public constructor(
    readonly kind: BridgeFailureKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "BridgeClientError";
  }
}

export interface BridgeTransport {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface BridgeHealth {
  status: "ok";
  protocolVersion: number;
}

/** Authenticated, loopback-only bridge operations. It never logs a token or state. */
export class BridgeClient {
  public constructor(
    private readonly settings: Pick<
      PluginSettings,
      "bridgeHost" | "bridgePort" | "publisherToken"
    >,
    private readonly transport: BridgeTransport = globalThis,
  ) {}

  public async publish(state: KLyricState): Promise<void> {
    const response = await this.request("/v1/state", {
      method: "POST",
      body: JSON.stringify(state),
      headers: { "content-type": "application/json" },
    });
    if (response.status === 202 || response.status === 204) return;
    throw await responseError(response);
  }

  public async clear(): Promise<void> {
    const response = await this.request("/v1/state", { method: "DELETE" });
    if (response.status === 204) return;
    throw await responseError(response);
  }

  public async health(): Promise<BridgeHealth> {
    let response: Response;
    try {
      response = await this.transport.fetch(`${this.baseUrl()}/health`, {
        credentials: "omit",
      });
    } catch {
      throw new BridgeClientError("network", "Bridge connection failed");
    }
    if (!response.ok) throw await responseError(response);
    const body = await response.json().catch(() => null);
    if (!isHealth(body)) {
      throw new BridgeClientError(
        "validation",
        "Bridge health response is invalid",
      );
    }
    return body;
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    if (this.settings.publisherToken === "") {
      throw new BridgeClientError(
        "authentication",
        "Publisher token is not configured",
      );
    }
    try {
      return await this.transport.fetch(`${this.baseUrl()}${path}`, {
        ...init,
        credentials: "omit",
        headers: {
          ...init.headers,
          authorization: `Bearer ${this.settings.publisherToken}`,
        },
      });
    } catch {
      throw new BridgeClientError("network", "Bridge connection failed");
    }
  }

  private baseUrl(): string {
    return bridgeBaseUrl(this.settings);
  }
}

async function responseError(response: Response): Promise<BridgeClientError> {
  if (response.status === 401 || response.status === 403) {
    return new BridgeClientError(
      "authentication",
      "Bridge authentication failed",
      response.status,
    );
  }
  if (response.status >= 500 || response.status === 429) {
    return new BridgeClientError(
      "server",
      "Bridge temporarily rejected the request",
      response.status,
    );
  }
  return new BridgeClientError(
    "validation",
    "Bridge rejected the request",
    response.status,
  );
}

function isHealth(value: unknown): value is BridgeHealth {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<string, unknown>).status === "ok" &&
    typeof (value as Record<string, unknown>).protocolVersion === "number"
  );
}
