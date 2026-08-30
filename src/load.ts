import { readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { EnvError } from "./core/errors";

export interface LoadEnvOptions {
  /** Path to the file to load. Defaults to `./.env` relative to `process.cwd()`. */
  readonly path?: string;
  /**
   * When `true`, loaded values overwrite variables that already exist in the
   * environment. When `false` (the default), existing variables always win.
   */
  readonly override?: boolean;
  /** When `true`, a missing file throws {@link EnvError}. Defaults to `false`. */
  readonly required?: boolean;
}

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Replace simple escape sequences inside a double quoted value.
 */
function unescapeDoubleQuoted(value: string): string {
  return value.replace(/\\([\\"nrt])/g, (_, char: string) => {
    switch (char) {
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "\t";
      default:
        return char;
    }
  });
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"')) {
    const match = /^"([\s\S]*)"$/.exec(trimmed);
    return match === null ? "" : unescapeDoubleQuoted(match[1] ?? "");
  }
  if (trimmed.startsWith("'")) {
    const match = /^'([\s\S]*)'$/.exec(trimmed);
    return match === null ? "" : (match[1] ?? "");
  }
  // Unquoted values: strip a trailing comment. A `#` only starts a comment
  // when preceded by whitespace, mirroring common dotenv behavior.
  return trimmed.replace(/\s+#.*$/, "").trim();
}

function parseLine(line: string, result: Record<string, string>): void {
  const trimmed = line.trim().replace(/^export\s+/, "");
  if (trimmed.length === 0 || trimmed.startsWith("#")) return;

  const eq = trimmed.indexOf("=");
  if (eq === -1) return;

  const key = trimmed.slice(0, eq).trim();
  if (!KEY_RE.test(key)) return;

  const rawValue = trimmed.slice(eq + 1);
  result[key] = unquote(rawValue);
}

/**
 * Load a `.env`-style file into `process.env` and return the parsed pairs.
 *
 * - Existing environment variables are never overridden unless
 *   `override: true` is set.
 * - Lines starting with `#` are comments. A `#` after whitespace inside an
 *   unquoted value also starts a comment.
 * - Values may be quoted with `'` or `"`; double quotes support `\n`, `\r`,
 *   `\t`, `\"` and `\\` escapes. `export KEY=value` prefixes are allowed.
 * - Blank lines and lines without `=` are ignored.
 * - A UTF-8 byte-order mark and CRLF line endings are handled.
 * - Later duplicates of the same key win within one file.
 * - **Not supported by design** (this is a deliberately minimal loader, not a
 *   full dotenv implementation): multiline quoted values and `${VAR}`
 *   interpolation. Such lines are treated as literal text.
 *
 * Error contract: when `required: true` and the file is missing or unreadable,
 * a base {@link EnvError} with code `invalid_options` is thrown (the loader
 * signals a configuration problem, not a data-parse failure). When
 * `required` is false, a missing/unreadable file yields `{}`.
 *
 * @example
 * loadEnv()                        // reads ./.env from the working directory
 * loadEnv({ path: ".env.local" })
 * loadEnv({ override: true, required: true })
 */
export function loadEnv(options?: LoadEnvOptions | string): Record<string, string> {
  const settings: LoadEnvOptions =
    typeof options === "string" ? { path: options } : (options ?? {});

  const requested = settings.path ?? ".env";
  const filePath = isAbsolute(requested) ? requested : join(resolve("."), requested);

  let source: string;
  try {
    source = readFileSync(filePath, "utf8");
  } catch (error) {
    if (settings.required === true) {
      const detail =
        error instanceof Error && "code" in error && error.code === "ENOENT"
          ? "Could not find the file"
          : "The file could not be read";
      // `invalid_options` is the documented envelope for loader I/O failures:
      // it signals a configuration problem (frozen `EnvErrorCode` set), not a
      // data-parse failure. The original I/O error is preserved as `cause`.
      throw new EnvError(`${detail} at "${filePath}".`, "invalid_options", { cause: error });
    }
    return {};
  }

  // Strip a UTF-8 byte-order mark that some editors add.
  if (source.charCodeAt(0) === 0xfeff) {
    source = source.slice(1);
  }

  const parsed: Record<string, string> = {};
  for (const line of source.split(/\r?\n/)) {
    parseLine(line, parsed);
  }

  for (const [key, value] of Object.entries(parsed)) {
    const existing = process.env[key];
    if (existing === undefined || settings.override === true) {
      process.env[key] = value;
    }
  }

  return parsed;
}
