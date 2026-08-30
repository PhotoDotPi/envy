import type { EnvResult, EnvSource, Field } from "../src";
import { parseEnv, parseEnvOrThrow } from "../src";

/**
 * Set environment variables for the duration of a test. Pass `undefined` to
 * simulate an unset variable. Returns a restore function.
 */
export function withEnv(vars: Record<string, string | undefined>): () => void {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

/**
 * Parse a single field against an explicit source and return its value
 * (throwing on failure). This is the runtime-agnostic equivalent of the old
 * `process.env`-backed accessor, without touching `process.env`.
 */
export function parseValue<T, Out>(field: Field<T, Out>, source: EnvSource): Out {
  return parseEnvOrThrow({ value: field }, source).value;
}

/** Parse a single field against an explicit source and return the result. */
export function parseResult<T, Out>(
  field: Field<T, Out>,
  source: EnvSource,
): EnvResult<{ value: Field<T, Out> }> {
  return parseEnv({ value: field }, source);
}

/** A convenience for the common test pattern `{ FIELD: value }`. */
export function src(values: Record<string, string | undefined>): EnvSource {
  return values;
}

/** Type-only probe: returns the field's output type without parsing/reading anything. */
export function typeProbe<T, Out>(_field: Field<T, Out>): Out {
  return undefined as Out;
}
