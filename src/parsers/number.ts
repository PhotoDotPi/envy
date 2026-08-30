import { EnvParseError, EnvSchemaError } from "../core/errors";
import type { Field } from "../core/field";
import type { NumberOptions } from "../core/types";
import { compose, runCustom } from "../validation/validation";
import { makeField } from "./helpers";

export function number(name: string): Field<number>;
export function number(name: string, defaultValue: number): Field<number>;
export function number(name: string, defaultValue: undefined): Field<number, number | undefined>;
export function number(name: string, options: NumberOptions & { default: number }): Field<number>;
export function number(
  name: string,
  options: NumberOptions & { optional: true },
): Field<number, number | undefined>;
export function number(name: string, options: NumberOptions): Field<number>;
export function number(
  name: string,
  ...args: [optionsOrDefault?: NumberOptions | number | undefined]
): Field<number> {
  const [optionsOrDefault] = args;
  validateBounds(optionsOrDefault as NumberOptions | undefined);

  const optional = args.length > 0 && optionsOrDefault === undefined;
  let options: NumberOptions | undefined;
  let defaultValue: number | undefined;

  if (optionsOrDefault === undefined) {
    // required unless explicitly passed `undefined`
  } else if (typeof optionsOrDefault === "number") {
    defaultValue = optionsOrDefault;
  } else if (optionsOrDefault !== null) {
    options = optionsOrDefault;
    if (typeof options.default === "number") {
      defaultValue = options.default;
    }
  } else {
    throw new EnvSchemaError(
      "Invalid argument: expected a default value or options object, got null.",
    );
  }

  return makeField<number>({
    name,
    expected: "a number",
    parseCode: "invalid_number",
    trim: true,
    default: defaultValue,
    optional: optional || options?.optional === true,
    parse: (raw) => {
      if (!NUMERIC_RE.test(raw)) {
        throw new EnvParseError(name, "a number", raw, "invalid_number", options?.secret);
      }
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        throw new EnvParseError(name, "a number", raw, "invalid_number", options?.secret);
      }
      return value;
    },
    validate: makeValidator(options, name),
    description: options?.description,
    example: options?.example,
  });
}

function validateBounds(options: NumberOptions | undefined): void {
  const { min, max } = options ?? {};
  if (min !== undefined && max !== undefined && min > max) {
    throw new EnvSchemaError("Invalid options: min cannot be greater than max.");
  }
}

function makeValidator(options: NumberOptions | undefined, name: string) {
  return compose<number>([
    (value) => {
      if (options?.min !== undefined && value < options.min) {
        return `must be at least ${options.min}`;
      }
      return null;
    },
    (value) => {
      if (options?.max !== undefined && value > options.max) {
        return `must be at most ${options.max}`;
      }
      return null;
    },
    (value) => {
      if (options?.integer === true && !Number.isInteger(value)) {
        return "must be an integer";
      }
      return null;
    },
    (value) => runCustom(options?.custom, value, name),
  ]);
}

/**
 * Strict numeric format: an optional sign, then an integer or decimal part,
 * with an optional exponent. Rejects hex (`0x10`), `Infinity`, `NaN` and any
 * value that does not round-trip through `Number`. Surrounding whitespace is
 * trimmed before parsing.
 */
const NUMERIC_RE = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/;
