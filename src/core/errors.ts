/**
 * Structured, typed errors thrown by `envy-ts`.
 *
 * Every error subclasses {@link EnvError} and carries a machine-readable
 * {@link EnvErrorCode} (via `code`) plus a human-readable `message`. Sensitive
 * variable values are never echoed.
 */

/**
 * Machine-readable error code, stable across versions and usable to switch
 * programmatically without parsing messages. This union is **frozen as a v1
 * contract**: adding or renaming a code is a semver-major change.
 *
 * `invalid_options` is also used as the envelope for `loadEnv` I/O failures
 * (missing/unreadable file): the loader signals a configuration problem, not a
 * data-parse failure, and shares the existing code rather than introducing a
 * new one before the set is frozen.
 */
export type EnvErrorCode =
  | "missing"
  | "invalid_number"
  | "invalid_boolean"
  | "invalid_bigint"
  | "invalid_url"
  | "invalid_enum"
  | "invalid_email"
  | "invalid_host"
  | "invalid_port"
  | "invalid_json"
  | "validation"
  | "invalid_options";

/**
 * Words that indicate a variable may hold secret material. Values for such
 * variables are never echoed in error messages.
 */
const SENSITIVE_KEYWORDS = [
  "PASSWORD",
  "PASSWD",
  "SECRET",
  "TOKEN",
  "KEY",
  "CREDENTIAL",
  "PRIVATE",
  "AUTH",
  "SALT",
] as const;

const SENSITIVE_NAMES = new Set<string>(SENSITIVE_KEYWORDS);

/**
 * Stable public redaction helper: `true` when one of the variable's
 * underscore/word segments (e.g. `API_KEY`, `JWT_SECRET`) matches a known
 * secret word. Segment matching avoids false positives like `MONKEY` or
 * `KEYBOARD`.
 *
 * @see {@link safeValue} for building your own safe error messages.
 */
export function isSensitiveName(name: string): boolean {
  const segments = name
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((s) => s.length > 0);
  return segments.some((s) => SENSITIVE_NAMES.has(s));
}

/**
 * The maximum number of characters of a non-secret value that may be echoed.
 * Exactly 40 characters are kept; longer values are truncated to 39 characters
 * plus a single ellipsis. This length is part of the redaction contract.
 */
const REDACT_TRUNCATE_LENGTH = 40;

function truncate(value: string): string {
  return value.length <= REDACT_TRUNCATE_LENGTH
    ? value
    : `${value.slice(0, REDACT_TRUNCATE_LENGTH - 1)}…`;
}

/**
 * Stable public redaction helper: the value (if any) that is safe to include
 * in an error message for the given variable name. Secret-like values are
 * omitted entirely (returns `undefined`), and non-secret values are truncated
 * to a safe length.
 */
export function safeValue(name: string, raw: string, secret?: boolean): string | undefined {
  if (secret === true || isSensitiveName(name)) return undefined;
  return truncate(raw);
}

/**
 * A rendered representation of a received value that is safe to surface to
 * users: quoted and truncated for ordinary values, or a placeholder for values
 * that must stay secret. Returns `undefined` for secret variables so callers
 * can omit the "received" segment entirely.
 */
export function safeReceived(name: string, raw: string, secret?: boolean): string | undefined {
  const value = safeValue(name, raw, secret);
  return value === undefined ? undefined : `"${value}"`;
}

/** Public contract for all errors emitted by the library. */
export interface EnvErrorCodeHolder {
  readonly code: EnvErrorCode;
}

/** Additional metadata attached to an error instance. */
export interface EnvErrorOptions {
  readonly variable?: string;
  readonly cause?: unknown;
}

/**
 * Base class for every error thrown/returned by `envy-ts`.
 *
 * Catch `EnvError` (or inspect `code`) to handle any configuration problem
 * programmatically.
 */
export class EnvError extends Error implements EnvErrorCodeHolder {
  /** The name of the environment variable the error relates to, if any. */
  readonly variable?: string;
  /** Machine-readable error code. */
  readonly code: EnvErrorCode;

  constructor(message: string, code: EnvErrorCode, options: EnvErrorOptions = {}) {
    const cause = options.cause === undefined ? undefined : { cause: options.cause };
    super(message, cause);
    this.name = "EnvError";
    this.code = code;
    if (options.variable !== undefined) {
      this.variable = options.variable;
    }
  }
}

/**
 * Thrown when a required variable is missing (or its value is empty).
 */
export class EnvMissingError extends EnvError {
  /** A description of what the variable should have been, e.g. `a number`. */
  readonly expected?: string;

  constructor(variable: string, expected?: string) {
    const suffix = expected === undefined ? "" : ` Expected: ${expected}.`;
    super(
      `Environment variable "${variable}" is required but was not provided.${suffix}`,
      "missing",
      { variable },
    );
    this.name = "EnvMissingError";
    if (expected !== undefined) {
      this.expected = expected;
    }
  }
}

/**
 * Thrown when a value is present but cannot be parsed into the requested type.
 */
export class EnvParseError extends EnvError {
  /** A description of the expected value, e.g. `a number`. */
  readonly expected?: string;
  /**
   * The received value rendered safely: quoted and truncated for ordinary
   * values, or `undefined` for secret variables so it never leaks.
   */
  readonly received?: string;

  constructor(
    variable: string,
    expected: string,
    received: string,
    code: EnvErrorCode,
    secret = false,
  ) {
    const safe = safeReceived(variable, received, secret);
    const shown = safe === undefined ? "" : ` Received: ${safe}.`;
    super(`Environment variable "${variable}" must be ${expected}.${shown}`, code, {
      variable,
    });
    this.name = "EnvParseError";
    this.expected = expected;
    if (safe !== undefined) {
      this.received = safe;
    }
  }
}

/**
 * Thrown when a parsed value fails one or more validation rules.
 */
export class EnvValidationError extends EnvError {
  /** A description of the expected value, e.g. `a number`. */
  readonly expected?: string;
  /** The human readable reason the validation failed. */
  readonly reason?: string;

  constructor(variable: string, expected: string, reason: string) {
    super(`Environment variable "${variable}" failed validation: ${reason}.`, "validation", {
      variable,
    });
    this.name = "EnvValidationError";
    this.expected = expected;
    this.reason = reason;
  }
}

/**
 * Thrown when the schema/options themselves are invalid (not a data problem).
 */
export class EnvSchemaError extends EnvError {
  constructor(message: string) {
    super(message, "invalid_options");
    this.name = "EnvSchemaError";
  }
}
