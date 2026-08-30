import { EnvParseError, EnvSchemaError } from "../core/errors";
import type { Field } from "../core/field";
import type { BigIntOptions } from "../core/types";
import { compose, runCustom } from "../validation/validation";
import { makeField } from "./helpers";

/** Parse a bigint-valued environment variable. */
export function bigint(name: string): Field<bigint>;
export function bigint(name: string, defaultValue: bigint): Field<bigint>;
export function bigint(name: string, defaultValue: undefined): Field<bigint, bigint | undefined>;
export function bigint(name: string, options: BigIntOptions & { default: bigint }): Field<bigint>;
export function bigint(
  name: string,
  options: BigIntOptions & { optional: true },
): Field<bigint, bigint | undefined>;
export function bigint(name: string, options: BigIntOptions): Field<bigint>;
export function bigint(
  name: string,
  ...args: [optionsOrDefault?: BigIntOptions | bigint | undefined]
): Field<bigint> {
  const [optionsOrDefault] = args;
  validateBounds(optionsOrDefault as BigIntOptions | undefined);

  const optional = args.length > 0 && optionsOrDefault === undefined;
  let options: BigIntOptions | undefined;
  let defaultValue: bigint | undefined;

  if (optionsOrDefault === undefined) {
    // required unless explicitly passed `undefined`
  } else if (typeof optionsOrDefault === "bigint") {
    defaultValue = optionsOrDefault;
  } else if (optionsOrDefault !== null) {
    options = optionsOrDefault;
    if (typeof options.default === "bigint") {
      defaultValue = options.default;
    }
  } else {
    throw new EnvSchemaError(
      "Invalid argument: expected a default value or options object, got null.",
    );
  }

  return makeField<bigint>({
    name,
    expected: "a bigint",
    parseCode: "invalid_bigint",
    trim: true,
    default: defaultValue,
    optional: optional || options?.optional === true,
    parse: (raw) => {
      if (!BIGINT_RE.test(raw)) {
        throw new EnvParseError(name, "a bigint", raw, "invalid_bigint", options?.secret);
      }
      try {
        return BigInt(raw);
      } catch {
        throw new EnvParseError(name, "a bigint", raw, "invalid_bigint", options?.secret);
      }
    },
    validate: makeValidator(options, name),
    description: options?.description,
    example: options?.example,
  });
}

function validateBounds(options: BigIntOptions | undefined): void {
  const { min, max } = options ?? {};
  if (min !== undefined && max !== undefined && min > max) {
    throw new EnvSchemaError("Invalid options: min cannot be greater than max.");
  }
}

function makeValidator(options: BigIntOptions | undefined, name: string) {
  return compose<bigint>([
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
    (value) => runCustom(options?.custom, value, name),
  ]);
}

/**
 * Strict integer format: an optional sign followed by decimal digits only.
 * Rejects decimals, hex (`0x10`) and anything `BigInt` cannot parse.
 * Surrounding whitespace is trimmed before parsing.
 */
const BIGINT_RE = /^[+-]?\d+$/;
