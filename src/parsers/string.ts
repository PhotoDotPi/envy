import { EnvSchemaError } from "../core/errors";
import type { Field } from "../core/field";
import type { StringOptions } from "../core/types";
import { compose, runCustom } from "../validation/validation";
import { makeField } from "./helpers";

export function string(name: string): Field<string>;
export function string(name: string, defaultValue: string): Field<string>;
export function string(name: string, defaultValue: undefined): Field<string, string | undefined>;
export function string(name: string, options: StringOptions & { default: string }): Field<string>;
export function string(
  name: string,
  options: StringOptions & { optional: true },
): Field<string, string | undefined>;
export function string(name: string, options: StringOptions): Field<string>;
export function string(
  name: string,
  ...args: [optionsOrDefault?: StringOptions | string | undefined]
): Field<string> {
  const [optionsOrDefault] = args;
  validateLengthOptions(optionsOrDefault as StringOptions | undefined);

  const optional = args.length > 0 && optionsOrDefault === undefined;
  let options: StringOptions | undefined;
  let defaultValue: string | undefined;

  if (optionsOrDefault === undefined) {
    // required unless explicitly passed `undefined`
  } else if (typeof optionsOrDefault === "string") {
    defaultValue = optionsOrDefault;
  } else if (optionsOrDefault !== null) {
    options = optionsOrDefault;
    if (typeof options.default === "string") {
      defaultValue = options.default;
    }
  } else {
    throw new EnvSchemaError(
      "Invalid argument: expected a default value or options object, got null.",
    );
  }

  return makeField<string>({
    name,
    expected: "a string",
    // The string parser's `parse` is the identity and never throws, so this
    // code is unreachable for the built-in parser; it exists only to satisfy
    // the descriptor contract. `invalid_options` (part of the frozen
    // `EnvErrorCode` set) is the correct signal if it is ever surfaced for a
    // hand-built field with a throwing parse.
    parseCode: "invalid_options",
    trim: options?.trim === true,
    default: defaultValue,
    optional: optional || options?.optional === true,
    parse: (raw) => raw,
    validate: makeValidator(options, name),
    description: options?.description,
    example: options?.example,
  });
}

function validateLengthOptions(options: StringOptions | undefined): void {
  const { minLength, maxLength } = options ?? {};
  if (minLength !== undefined && maxLength !== undefined && minLength > maxLength) {
    throw new EnvSchemaError("Invalid options: minLength cannot be greater than maxLength.");
  }
}

function makeValidator(options: StringOptions | undefined, name: string) {
  return compose<string>([
    (value) => {
      if (options?.minLength !== undefined && value.length < options.minLength) {
        return `length must be at least ${options.minLength}`;
      }
      return null;
    },
    (value) => {
      if (options?.maxLength !== undefined && value.length > options.maxLength) {
        return `length must be at most ${options.maxLength}`;
      }
      return null;
    },
    (value) => {
      if (options?.pattern !== undefined) {
        // Reset lastIndex so a reusable global/sticky regex is deterministic
        // across repeated validation calls (BUG-001).
        options.pattern.lastIndex = 0;
        if (!options.pattern.test(value)) {
          return `must match ${options.pattern}`;
        }
      }
      return null;
    },
    (value) => runCustom(options?.custom, value, name),
  ]);
}
