import type { EnvError, EnvErrorCode } from "./errors";
import type { Field, Schema } from "./field";
import { readField } from "./resolve";
import type { EnvSource } from "./source";

/**
 * The inferred, parsed type of a schema: each key maps to the exposed output
 * type of its field. Optional/`| undefined` fields keep their `undefined` so
 * optional keys type correctly.
 */
export type Parsed<S extends Schema> = {
  // biome-ignore lint/suspicious/noExplicitAny: need a variance-safe field template to extract `Out`.
  [K in keyof S]: S[K] extends Field<any, infer Out> ? Out : never;
};

export type { Schema } from "./field";

/** A structured, machine-readable per-variable error. */
export interface EnvFieldError {
  /** The offending variable name. */
  variable: string;
  /** Machine-readable error code. */
  code: EnvErrorCode;
  /** Human-readable message. */
  message: string;
  /** Description of what was expected (missing/parse only). */
  expected?: string;
  /**
   * The received value rendered safely (quoted/truncated), or omitted for
   * secret variables so values never leak.
   */
  received?: string;
}

/** Per-variable structured errors keyed by schema key. */
export type EnvErrors<S extends Schema> = {
  [K in keyof S & string]?: EnvFieldError;
};

/**
 * The result of parsing a schema against a source.
 *
 * - `success: true` → the immutable, typed parsed configuration.
 * - `success: false` → per-variable structured errors (all variables that
 *   failed in one parse, plus the parser's own error for the failing key).
 */
export type EnvResult<S extends Schema> =
  | { success: true; env: Readonly<Parsed<S>> }
  | { success: false; errors: EnvErrors<S> };

/**
 * Build a structured {@link EnvFieldError} from a thrown {@link EnvError}
 * without ever exposing secret values.
 */
function toFieldError(key: string, error: EnvError): EnvFieldError {
  const out: EnvFieldError = { variable: key, code: error.code, message: error.message };
  const expected = (error as { expected?: string }).expected;
  if (expected !== undefined) out.expected = expected;
  const received = (error as { received?: string }).received;
  if (received !== undefined) out.received = received;
  return out;
}

/**
 * Assign a key into a plain object without ever going through the `__proto__`
 * setter, so a schema key named `"__proto__"` becomes an own data property
 * instead of mutating the object's prototype.
 */
function safeKeyAssign(target: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

/**
 * Convert an internal null-prototype parse map into the public output shape: a
 * **plain**, **frozen** object with all values as own properties.
 * `Object.fromEntries` creates own data properties even for `"__proto__"`, and
 * freezing makes the result immutable without deep-freezing option-referenced
 * values (`URL`, `RegExp`, parsed JSON objects).
 */
function publicOutput(env: object): object {
  return Object.freeze(Object.fromEntries(Object.entries(env)));
}

/**
 * Parse a schema against an explicit environment source, returning a
 * discriminated-union {@link EnvResult} instead of throwing. Both the parsed
 * configuration (on success) and any failures are immutable and use strong
 * TypeScript inference.
 *
 * All variables are parsed; every failure is collected, so you can discover
 * multiple missing/invalid variables in one call.
 *
 * @example
 * const schema = {
 *   PORT: env.number("PORT", { default: 3000, min: 1 }),
 *   DATABASE_URL: env.string("DATABASE_URL"),
 * }
 * const result = parseEnv(schema, { PORT: "8080" })
 * if (result.success) {
 *   result.env.PORT // 8080
 * } else {
 *   result.errors.DATABASE_URL?.code // "missing"
 * }
 */
export function parseEnv<S extends Schema>(schema: S, source: EnvSource): EnvResult<S> {
  // P0-03 hardening: a non-object schema is treated as an empty schema rather
  // than crashing the engine (`Object.keys(null)` would throw a TypeError).
  const keys: Array<keyof S & string> =
    schema === null || schema === undefined || typeof schema !== "object"
      ? []
      : (Object.keys(schema) as Array<keyof S & string>);
  const errors: EnvErrors<S> = {};
  const env: Parsed<S> = Object.create(null) as Parsed<S>;
  let anyFailed = false;

  for (const key of keys) {
    const field = schema[key] as Field<unknown>;
    const outcome = readField(field, source);
    if (outcome.ok) {
      (env as Record<string, unknown>)[key] = outcome.value;
    } else {
      anyFailed = true;
      safeKeyAssign(errors as Record<string, unknown>, key, toFieldError(key, outcome.error));
    }
  }

  if (anyFailed) {
    return { success: false, errors };
  }
  return { success: true, env: publicOutput(env) as Readonly<Parsed<S>> };
}

/**
 * Parse a schema against an explicit environment source, throwing on the first
 * invalid variable (deterministic schema order). Returns an immutable, typed
 * configuration. Shares the same engine as {@link parseEnv} so behavior
 * cannot drift between the throwing and result APIs.
 *
 * @example
 * const env = parseEnvOrThrow(
 *   { PORT: env.number("PORT", { min: 1 }), MODE: env.enum("MODE", ["a","b"]) },
 *   { PORT: "8080", MODE: "a" },
 * )
 */
export function parseEnvOrThrow<S extends Schema>(
  schema: S,
  source: EnvSource,
): Readonly<Parsed<S>> {
  const keys: Array<keyof S & string> =
    schema === null || schema === undefined || typeof schema !== "object"
      ? []
      : (Object.keys(schema) as Array<keyof S & string>);
  const env: Parsed<S> = Object.create(null) as Parsed<S>;
  for (const key of keys) {
    const field = schema[key] as Field<unknown>;
    const outcome = readField(field, source);
    if (!outcome.ok) throw outcome.error;
    (env as Record<string, unknown>)[key] = outcome.value;
  }
  return publicOutput(env) as Readonly<Parsed<S>>;
}
