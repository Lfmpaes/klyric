import { KLyricPlugin } from "./application/KLyricPlugin";
import { runCapabilityInspection } from "./diagnostics/CapabilityInspectionTool";
import { Diagnostics } from "./diagnostics/Diagnostics";
import { BridgeClient } from "./publisher/BridgeClient";
import {
  type PluginSettings,
  PluginSettingsStore,
} from "./settings/PluginSettings";

export { runCapabilityInspection };

const settingsStore = new PluginSettingsStore();

export function loadPluginSettings(): PluginSettings {
  return settingsStore.load();
}

export function savePluginSettings(settings: PluginSettings): PluginSettings {
  return settingsStore.save(settings);
}

export async function testBridgeConnection(
  settings = settingsStore.load(),
): Promise<boolean> {
  try {
    await new BridgeClient(settings).health();
    return true;
  } catch {
    return false;
  }
}

interface CiderPluginContext {
  author: string;
  ce_prefix: string;
  description: string;
  entry: {
    "plugin.js": {
      type: "main";
    };
  };
  identifier: string;
  name: string;
  pluginKitVersion: string;
  repo: string;
  setup(): void;
  version: string;
}

const runtimeKey = Symbol.for("dev.luizpaes.klyric.runtime");

interface PluginRuntime {
  instance?: KLyricPlugin;
  setup?: Promise<void>;
  diagnostics?: Diagnostics;
}

type PluginHost = typeof globalThis & {
  [key: symbol]: PluginRuntime | undefined;
};

const plugin: CiderPluginContext = {
  author: "Luiz Paes",
  ce_prefix: "klyric",
  description:
    "Publishes Cider's active synchronized lyric line to KDE Plasma.",
  entry: {
    "plugin.js": {
      type: "main",
    },
  },
  identifier: "dev.luizpaes.klyric",
  name: "KLyric",
  pluginKitVersion: "4",
  repo: "https://github.com/Lfmpaes/klyric",
  setup() {
    const host = globalThis as PluginHost;
    const runtime = host[runtimeKey] ?? {};
    host[runtimeKey] = runtime;
    // Capability data remains in the in-memory diagnostics snapshot. Release
    // builds do not emit routine capability reports to Cider's developer log.
    const diagnostics = new Diagnostics(
      plugin.version,
      runCapabilityInspection(),
    );
    runtime.diagnostics = diagnostics;
    runtime.setup = (async () => {
      await runtime.instance?.teardown();
      const instance = new KLyricPlugin({
        diagnostics,
        onError: (error) => console.warn("[KLyric] observer error", error.name),
      });
      runtime.instance = instance;
      await instance.setup();
    })().catch((error: unknown) => {
      console.warn(
        "[KLyric] setup failed",
        error instanceof Error ? error.name : "UnknownError",
      );
    });
  },
  version: "0.1.0",
};

export default plugin;
