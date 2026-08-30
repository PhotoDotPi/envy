import { EnvParseError, EnvSchemaError } from "../core/errors";
import type { Field } from "../core/field";
import type { EnumOptions } from "../core/types";
import { runCustom } from "../validation/validation";
import { makeField } from "./helpers";

/** Parse a string from a fixed allow-list of enum values. */
export function enumValue<const T extends readonly string[]>(
  name: string,
  values: T,
): Field<T[number]>;
export function enumValue<const T extends readonly string[]>(
  name: string,
  values: T,
  defaultValue: T[number],
): Field<T[number]>;
export function enumValue<const T extends readonly string[]>(
  name: string,
  values: T,
  defaultValue: undefined,
): Field<T[number], T[number] | undefined>;
export function enumValue<const T extends readonly string[]>(
  name: string,
  values: T,
  options: EnumOptions<T> & { default: T[number] },
): Field<T[number]>;
export function enumValue<const T extends readonly string[]>(
  name: string,
  values: T,
  options: EnumOptions<T> & { optional: true },
): Field<T[number], T[number] | undefined>;
export function enumValue<const T extends readonly string[]>(
  name: string,
  values: T,
  options: EnumOptions<T>,
): Field<T[number]>;
export function enumValue<const T extends readonly string[]>(
  name: string,
  values: T,
  ...args: [optionsOrDefault?: T[number] | EnumOptions<T> | undefined]
): Field<T[number]> {
  if (values.length === 0) {
    throw new EnvSchemaError("Invalid options: enum values must not be empty.");
  }

  const [optionsOrDefault] = args;
  const optional = args.length > 0 && optionsOrDefault === undefined;
  let options: EnumOptions<T> | undefined;
  let defaultValue: T[number] | undefined;
  const expected = listExpected(values);

  if (optionsOrDefault === undefined) {
    // required unless explicitly passed `undefined`
  } else if (typeof optionsOrDefault === "string") {
    defaultValue = optionsOrDefault as T[number];
  } else if (optionsOrDefault !== null) {
    options = optionsOrDefault;
    if (options.default !== undefined) {
      defaultValue = options.default;
    }
  } else {
    throw new EnvSchemaError(
      "Invalid argument: expected a default value or options object, got null.",
    );
  }

  const allowed = values as readonly string[];

  return makeField<T[number]>({
    name,
    expected,
    parseCode: "invalid_enum",
    trim: true,
    default: defaultValue,
    optional: optional || options?.optional === true,
    parse: (raw) => {
      if (!allowed.includes(raw)) {
        throw new EnvParseError(name, expected, raw, "invalid_enum", options?.secret);
      }
      return raw as T[number];
    },
    validate: (value) => {
      if (!allowed.includes(value)) {
        return "not an allowed enum value";
      }
      return runCustom(options?.custom, value, name);
    },
    description: options?.description,
    example: options?.example,
  });
}

function listExpected<const T extends readonly string[]>(values: T): string {
  return `one of: ${values.map((value) => JSON.stringify(value)).join(", ")}`;
}
