import { EnvParseError, EnvSchemaError } from "../core/errors";
import type { Field } from "../core/field";
import type { BooleanOptions } from "../core/types";
import { runCustom } from "../validation/validation";
import { makeField } from "./helpers";

/** Parse a boolean-valued environment variable from common truthy/falsy strings. */
export function boolean(name: string): Field<boolean>;
export function boolean(name: string, defaultValue: boolean): Field<boolean>;
export function boolean(name: string, defaultValue: undefined): Field<boolean, boolean | undefined>;
export function boolean(
  name: string,
  options: BooleanOptions & { default: boolean },
): Field<boolean>;
export function boolean(
  name: string,
  options: BooleanOptions & { optional: true },
): Field<boolean, boolean | undefined>;
export function boolean(name: string, options: BooleanOptions): Field<boolean>;
export function boolean(
  name: string,
  ...args: [optionsOrDefault?: BooleanOptions | boolean | undefined]
): Field<boolean> {
  const [optionsOrDefault] = args;
  const optional = args.length > 0 && optionsOrDefault === undefined;
  let options: BooleanOptions | undefined;
  let defaultValue: boolean | undefined;

  if (optionsOrDefault === undefined) {
    // required unless explicitly passed `undefined`
  } else if (typeof optionsOrDefault === "boolean") {
    defaultValue = optionsOrDefault;
  } else if (optionsOrDefault !== null) {
    options = optionsOrDefault;
    if (typeof options.default === "boolean") {
      defaultValue = options.default;
    }
  } else {
    throw new EnvSchemaError(
      "Invalid argument: expected a default value or options object, got null.",
    );
  }

  return makeField<boolean>({
    name,
    expected: BOOLEAN_EXPECTED,
    parseCode: "invalid_boolean",
    trim: true,
    default: defaultValue,
    optional: optional || options?.optional === true,
    parse: (raw) => {
      const key = raw.toLowerCase();
      const value = BOOLEAN_VALUES[key];
      if (value === undefined) {
        throw new EnvParseError(name, BOOLEAN_EXPECTED, raw, "invalid_boolean", options?.secret);
      }
      return value;
    },
    validate: (value) => runCustom(options?.custom, value, name),
    description: options?.description,
    example: options?.example,
  });
}

/**
 * Accepted values, case-insensitively: `true`, `false`, `1`, `0`, `yes`, `no`,
 * `on`, `off`. Surrounding whitespace is trimmed before parsing.
 */
const BOOLEAN_VALUES: Readonly<Record<string, boolean>> = {
  true: true,
  "1": true,
  yes: true,
  on: true,
  false: false,
  "0": false,
  no: false,
  off: false,
};

const BOOLEAN_EXPECTED = 'one of: "true", "1", "yes", "on", "false", "0", "no", "off"';
