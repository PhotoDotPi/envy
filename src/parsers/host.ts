import { EnvParseError, EnvSchemaError } from "../core/errors";
import type { Field } from "../core/field";
import type { HostOptions } from "../core/types";
import { runCustom } from "../validation/validation";
import { makeField } from "./helpers";

export function host(name: string): Field<string>;
export function host(name: string, defaultValue: string): Field<string>;
export function host(name: string, defaultValue: undefined): Field<string, string | undefined>;
export function host(name: string, options: HostOptions & { default: string }): Field<string>;
export function host(
  name: string,
  options: HostOptions & { optional: true },
): Field<string, string | undefined>;
export function host(name: string, options: HostOptions): Field<string>;
export function host(
  name: string,
  ...args: [optionsOrDefault?: HostOptions | string | undefined]
): Field<string> {
  const [optionsOrDefault] = args;
  const optional = args.length > 0 && optionsOrDefault === undefined;
  let options: HostOptions | undefined;
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
    expected: "a valid host",
    parseCode: "invalid_host",
    trim: true,
    default: defaultValue,
    optional: optional || options?.optional === true,
    parse: (raw) => {
      const valid = options?.tld === true ? isTldHostname(raw) : isHost(raw);
      if (!valid) {
        throw new EnvParseError(name, "a valid host", raw, "invalid_host", options?.secret);
      }
      return raw;
    },
    validate: (value) => runCustom(options?.custom, value, name),
    description: options?.description,
    example: options?.example,
  });
}

/**
 * A host is one of:
 * - a DNS hostname (letters/digits/hyphens separated by dots, labels 1-63),
 *   optionally a single label such as `localhost`;
 * - an IPv4 dotted-quad literal; or
 * - a bracketed IPv6 literal such as `[::1]`.
 */
function isHost(value: string): boolean {
  if (HOSTNAME_RE.test(value)) return true;
  if (IPV4_RE.test(value)) return true;
  return BRACKETED_IPV6_RE.test(value);
}

/** A hostname that must include a TLD (letters only, 2+ chars final label). */
function isTldHostname(value: string): boolean {
  return TLD_HOSTNAME_RE.test(value);
}

/**
 * Hostname: one or more labels of 1-63 characters, each alphanumeric or
 * hyphen, not starting/ending with a hyphen. At most 253 chars total.
 */
const HOSTNAME_RE =
  /^(?=.{1,253}$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** IPv4 dotted quad with each octet 0-255. */
const IPV4_RE = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

/** Bracketed IPv6 literal, e.g. `[::1]` or `[2001:db8::1]`. */
const BRACKETED_IPV6_RE = /^\[[0-9a-fA-F:]+\]$/;

/** Hostname ending in a TLD (letters only, 2+ chars). */
const TLD_HOSTNAME_RE =
  /^(?=.{1,253}$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
