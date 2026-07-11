import { runCapabilityInspection } from "./diagnostics/CapabilityInspectionTool";

export { runCapabilityInspection };

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
  repo: "",
  setup() {
    console.info("[KLyric research] Redacted Cider capability report", {
      ...runCapabilityInspection(),
      note: "Capability names only; no lyric text or host state is serialized.",
    });
  },
  version: "0.1.0",
};

export default plugin;
