import { PublisherTokenStore } from "./auth/PublisherToken";
import { resolveBridgeConfig } from "./config";
import { logger } from "./logging/logger";
import { startBridge } from "./server";

const BRIDGE_VERSION = "0.1.0";

interface CliArguments {
  readonly command: "serve" | "token-show" | "token-rotate";
  readonly configPath?: string;
  readonly host?: string;
  readonly port?: string;
}

function parseArguments(arguments_: readonly string[]): CliArguments {
  let command: CliArguments["command"] = "serve";
  let configPath: string | undefined;
  let host: string | undefined;
  let port: string | undefined;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "token" && arguments_[index + 1] === "show") {
      command = "token-show";
      index += 1;
    } else if (argument === "token" && arguments_[index + 1] === "rotate") {
      command = "token-rotate";
      index += 1;
    } else if (argument === "--config") {
      configPath = arguments_[++index];
    } else if (argument === "--host") {
      host = arguments_[++index];
    } else if (argument === "--port") {
      port = arguments_[++index];
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return {
    command,
    ...(configPath === undefined ? {} : { configPath }),
    ...(host === undefined ? {} : { host }),
    ...(port === undefined ? {} : { port }),
  };
}

async function main(): Promise<void> {
  const arguments_ = parseArguments(process.argv.slice(2));
  const config = await resolveBridgeConfig(arguments_);
  const tokenStore = new PublisherTokenStore(config.tokenPath);
  if (arguments_.command === "token-show") {
    console.log(await tokenStore.loadOrCreate());
    return;
  }
  if (arguments_.command === "token-rotate") {
    console.log(await tokenStore.rotate());
    return;
  }

  const bridge = await startBridge({
    bridgeVersion: BRIDGE_VERSION,
    config,
    logger,
    tokenStore,
  });
  const shutdown = (): void => bridge.stop();
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Bridge startup failed.",
  );
  process.exitCode = 1;
});
