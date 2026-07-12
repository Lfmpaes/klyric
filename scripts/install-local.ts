import {
  defaultReleaseSource,
  installLocal,
  parseInstallOptions,
} from "./local-installation";

await installLocal(
  parseInstallOptions(process.argv.slice(2), defaultReleaseSource()),
);
