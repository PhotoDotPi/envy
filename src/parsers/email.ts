import { EnvParseError, EnvSchemaError } from "../core/errors";
import type { Field } from "../core/field";
import type { EmailOptions } from "../core/types";
import { compose, runCustom } from "../validation/validation";
import { makeField } from "./helpers";

export function email(name: string): Field<string>;
export function email(name: string, defaultValue: string): Field<string>;
export function email(name: string, defaultValue: undefined): Field<string, string | undefined>;
export function email(name: string, options: EmailOptions & { default: string }): Field<string>;
export function email(
  name: string,
  options: EmailOptions & { optional: true },
): Field<string, string | undefined>;
export function email(name: string, options: EmailOptions): Field<string>;
export function email(
  name: string,
  ...args: [optionsOrDefault?: EmailOptions | string | undefined]
): Field<string> {
  const [optionsOrDefault] = args;
  const optional = args.length > 0 && optionsOrDefault === undefined;
  let options: EmailOptions | undefined;
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
    expected: "a valid email address",
    parseCode: "invalid_email",
    trim: true,
    default: defaultValue,
    optional: optional || options?.optional === true,
    parse: (raw) => {
      if (!EMAIL_RE.test(raw)) {
        throw new EnvParseError(
          name,
          "a valid email address",
          raw,
          "invalid_email",
          options?.secret,
        );
      }
      return raw;
    },
    validate: compose<string>([
      (value) => {
        if (options?.maxLength !== undefined && value.length > options.maxLength) {
          return `length must be at most ${options.maxLength}`;
        }
        return null;
      },
      (value) => runCustom(options?.custom, value, name),
    ]),
    description: options?.description,
    example: options?.example,
  });
}

/**
 * Pragmatic email matcher: a non-empty local part and domain separated by `@`,
 * with a dot-delimited domain. Deliberately not RFC 5322 exhaustive while
 * rejecting obvious malformed input (`a@b`, `@x.com`, `a b@c`).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
