import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  chmod,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname } from "node:path";

const TOKEN_BYTES = 32;

function isValidToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/u.test(value);
}

function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

async function writeToken(path: string, token: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporaryPath = `${path}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
  try {
    await writeFile(temporaryPath, `${token}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await chmod(temporaryPath, 0o600);
    await rename(temporaryPath, path);
    await chmod(path, 0o600);
  } finally {
    // A failed rename leaves no usable token and is retried on the next invocation.
    await rm(temporaryPath, { force: true }).catch(() => undefined);
  }
}

export class PublisherTokenStore {
  public constructor(private readonly path: string) {}

  public async loadOrCreate(): Promise<string> {
    try {
      const token = (await readFile(this.path, "utf8")).trim();
      if (!isValidToken(token)) {
        throw new Error(
          `Publisher token at ${this.path} is invalid; rotate it to continue.`,
        );
      }
      await chmod(this.path, 0o600);
      return token;
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "ENOENT")
      )
        throw error;
      const token = generateToken();
      await writeToken(this.path, token);
      return token;
    }
  }

  public async rotate(): Promise<string> {
    const token = generateToken();
    await writeToken(this.path, token);
    return token;
  }

  public matches(candidate: string | null): boolean {
    if (candidate === null || !isValidToken(candidate)) {
      return false;
    }
    try {
      return timingSafeEqual(
        Buffer.from(candidate),
        Buffer.from(this.currentToken),
      );
    } catch {
      return false;
    }
  }

  /** Reloads the token so rotation by a separate CLI process is immediate. */
  public async matchesActive(candidate: string | null): Promise<boolean> {
    this.currentToken = await this.loadOrCreate();
    return this.matches(candidate);
  }

  private currentToken = "";

  public async initialize(): Promise<void> {
    this.currentToken = await this.loadOrCreate();
  }

  public async rotateActive(): Promise<string> {
    this.currentToken = await this.rotate();
    return this.currentToken;
  }
}
