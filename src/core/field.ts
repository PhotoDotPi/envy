import type { EnvErrorCode } from "./errors";

/**
 * A `Field` is a pure, runtime-agnostic descriptor for a single environment
 * variable. It knows how to read the variable's name, coerce its raw string
 * into a typed value (`parse`, operating on the base type `T`, never
 * `undefined`), and validate the result (`validate`). It never touches any
 * runtime global; the source is supplied at parse time.
 *
 * The second generic parameter `Out` is a *phantom* that carries the final
 * value type the parser exposes to callers (`T` for a required variable,
 * `T | undefined` for an optional one). It exists only at the type level so
 * that `parse`/`validate` operate on `T` without variance conflicts while the
 * schema's inferred output type stays precise.
 */
export interface Field<T, Out = T> {
  readonly kind: "field";
  /** The environment variable name this field reads. */
  readonly name: string;
  /** Human-readable description of the expected value, e.g. `a number`. */
  readonly expected: string;
  /** Coerce a raw (trimmed) string into the typed base value; may throw. */
  readonly parse: (raw: string) => T;
  /** Optional validation step; returns a reason string or `null`. */
  readonly validate?: (value: T, name: string) => string | null;
  /** Whether to trim whitespace off the raw value before the empty check. */
  readonly trim?: boolean;
  /** Default value used when the variable is missing/empty. */
  readonly default?: T;
  /** When `true`, a missing/empty variable yields `undefined`. */
  readonly optional?: boolean;
  /** When `true`, values are never echoed, overriding name-based detection. */
  readonly secret?: boolean;
  /** Machine-readable code used when parsing fails. */
  readonly parseCode: EnvErrorCode;
  /** Optional metadata for schema introspection / format generation. */
  readonly description?: string;
  readonly example?: string;
  /**
   * @internal Phantom marker carrying the exposed parsed type. Never set at
   * runtime; used only for precise output inference.
   */
  readonly __out?: Out;
}

/**
 * A schema maps configuration keys to {@link Field} descriptors.
 *
 * ```ts
 * const schema = {
 *   PORT: env.number("PORT", { default: 3000, min: 1, max: 65535 }),
 *   DATABASE_URL: env.string("DATABASE_URL"),
 * }
 * ```
 * The `any` is internal; inference reconstructs the precise output type for
 * each key when the schema is passed to `parseEnv` / `parseEnvOrThrow`.
 */
// biome-ignore lint/suspicious/noExplicitAny: internal schema type; precise types are inferred per-key.
export type Schema = Record<string, Field<any, any>>;
