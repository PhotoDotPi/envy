import {
  type EnvError,
  EnvMissingError,
  EnvParseError,
  EnvSchemaError,
  EnvValidationError,
} from "./errors";
import type { Field } from "./field";
import type { EnvSource } from "./source";

/**
 * The result of parsing a single field against a source.
 *
 * - `ok: true`  → a valid, typed value (possibly `undefined` for an optional
 *   variable that is missing).
 * - `ok: false` → a structured {@link EnvError} describing the failure.
 */
export type FieldOutcome<T> = { ok: true; value: T } | { ok: false; error: EnvError };

/**
 * Validate a value for a field and return a reason string or `null`.
 */
function runValidate<T>(field: Field<T>, value: T): string | null {
  return field.validate?.(value, field.name) ?? null;
}

/**
 * Pure, runtime-agnostic parsing engine. Reads `field.name` from the given
 * source (never `process.env`) and coerces + validates it according to the
 * field, returning a typed value or a structured error.
 *
 * Semantics (documented in the README):
 * - A missing/empty source value uses the field's default when one is set,
 *   yields `undefined` when the field is optional, otherwise errors as missing.
 * - Defaults go through the same validation as parsed values.
 * - Parsing and validation failures produce typed {@link EnvError}s.
 */
export function readField<T>(field: Field<T>, source: EnvSource): FieldOutcome<T> {
  // P0-03: the schema is user input. A malformed entry (null, a primitive, an
  // object without a string `name`) must produce a structured schema error,
  // never a raw `TypeError` from destructuring or property access.
  if (field === null || field === undefined || typeof field !== "object") {
    return {
      ok: false,
      error: new EnvSchemaError(
        "Invalid schema: expected a field descriptor, got a non-object value.",
      ),
    };
  }
  const name = field.name;
  if (typeof name !== "string" || name.length === 0) {
    return {
      ok: false,
      error: new EnvSchemaError("Environment variable names must be non-empty strings."),
    };
  }

  // A missing source is treated as an empty one rather than crashing the parse
  // engine. Sources are documented as flat, string-keyed maps read at call time.
  const lookup: EnvSource =
    source === null || source === undefined || typeof source !== "object" ? {} : source;

  // P0-02: read values from OWN properties only. A source that sets a
  // `toString`/`__proto__`/`constructor` field name must never resolve to an
  // inherited property. `Object.hasOwn` is ES2022 and Node >= 16.9 (engines
  // floor is Node 18). Non-string own values are treated as absent: the core
  // contract is a string-keyed map, and a non-string can never be a valid env
  // value. The read itself stays live — mutation between parses is observed.
  let raw: string | undefined;
  if (Object.hasOwn(lookup, name)) {
    const candidate = lookup[name];
    raw = typeof candidate === "string" ? candidate : undefined;
  } else {
    raw = undefined;
  }

  if (raw !== undefined && field.trim === true) {
    raw = raw.trim();
  }

  if (raw === undefined || raw === "") {
    if (field.default !== undefined) {
      const reason = runValidate(field, field.default);
      if (reason !== null) {
        return {
          ok: false,
          error: new EnvValidationError(name, field.expected, reason),
        };
      }
      return { ok: true, value: field.default };
    }
    if (field.optional === true) {
      return { ok: true, value: undefined as T };
    }
    return { ok: false, error: new EnvMissingError(name, field.expected) };
  }

  let value: T;
  try {
    value = field.parse(raw);
  } catch (error) {
    if (error instanceof EnvParseError) {
      return { ok: false, error };
    }
    // A `URL`/JSON parse failure or any rethrown non-parse error should surface
    // as a parse error with the field's own code and expected description.
    return {
      ok: false,
      error: new EnvParseError(name, field.expected, raw, field.parseCode, field.secret),
    };
  }

  const reason = runValidate(field, value);
  if (reason !== null) {
    return {
      ok: false,
      error: new EnvValidationError(name, field.expected, reason),
    };
  }
  return { ok: true, value };
}
