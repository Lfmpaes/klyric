import { parseUninstallOptions, uninstallLocal } from "./local-installation";

await uninstallLocal(parseUninstallOptions(process.argv.slice(2)));
