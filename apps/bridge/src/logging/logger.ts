export interface Logger {
  info(
    event: string,
    fields?: Readonly<Record<string, boolean | number | string>>,
  ): void;
  warn(
    event: string,
    fields?: Readonly<Record<string, boolean | number | string>>,
  ): void;
  error(
    event: string,
    fields?: Readonly<Record<string, boolean | number | string>>,
  ): void;
}

function write(
  level: "error" | "info" | "warn",
  event: string,
  fields: Readonly<Record<string, boolean | number | string>> | undefined,
): void {
  // Callers provide metadata only: never token values, lyric text, or state payloads.
  console[level](JSON.stringify({ event, level, ...fields }));
}

export const logger: Logger = {
  error: (event, fields) => write("error", event, fields),
  info: (event, fields) => write("info", event, fields),
  warn: (event, fields) => write("warn", event, fields),
};
