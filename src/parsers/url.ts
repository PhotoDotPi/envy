import { EnvParseError, EnvSchemaError } from "../core/errors";
import type { Field } from "../core/field";
import type { UrlOptions } from "../core/types";
import { runCustom } from "../validation/validation";
import { makeField } from "./helpers";

/** Parse a valid URL value into a `URL` object. */
export function url(name: string): Field<URL>;
export function url(name: string, defaultValue: URL | string): Field<URL>;
export function url(name: string, defaultValue: undefined): Field<URL, URL | undefined>;
export function url(name: string, options: UrlOptions & { default: URL | string }): Field<URL>;
export function url(
  name: string,
  options: UrlOptions & { optional: true },
): Field<URL, URL | undefined>;
export function url(name: string, options: UrlOptions): Field<URL>;
export function url(
  name: string,
  ...args: [optionsOrDefault?: UrlOptions | URL | string | undefined]
): Field<URL> {
  const [optionsOrDefault] = args;
  const optional = args.length > 0 && optionsOrDefault === undefined;
  let options: UrlOptions | undefined;
  let defaultValue: URL | undefined;

  if (optionsOrDefault === undefined) {
    // required unless explicitly passed `undefined`
  } else if (optionsOrDefault instanceof URL) {
    defaultValue = optionsOrDefault;
  } else if (typeof optionsOrDefault === "string") {
    defaultValue = toUrl(name, optionsOrDefault);
  } else if (optionsOrDefault !== null) {
    options = optionsOrDefault;
    if (options.default !== undefined) {
      defaultValue = toUrl(name, options.default, options.secret);
    }
  } else {
    throw new EnvSchemaError(
      "Invalid argument: expected a default value or options object, got null.",
    );
  }

  return makeField<URL>({
    name,
    expected: "a valid URL",
    parseCode: "invalid_url",
    trim: true,
    default: defaultValue,
    optional: optional || options?.optional === true,
    parse: (raw) => {
      try {
        return new URL(raw);
      } catch {
        throw new EnvParseError(name, "a valid URL", raw, "invalid_url", options?.secret);
      }
    },
    validate: (value) => runCustom(options?.custom, value, name),
    description: options?.description,
    example: options?.example,
  });
}

function toUrl(variable: string, value: URL | string, secret = false): URL {
  if (value instanceof URL) return value;
  try {
    return new URL(value);
  } catch {
    throw new EnvParseError(variable, "a valid URL", value, "invalid_url", secret);
  }
}
