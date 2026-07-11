declare module "@ciderapp/pluginkit" {
  export interface PluginContext {
    setup(): void;
    name: string;
    identifier: string;
    ce_prefix: string;
    description: string;
    version: string;
    author: string;
    repo: string;
    pluginKitVersion: string;
  }

  export function definePluginContext(options: PluginContext): PluginContext;
}
