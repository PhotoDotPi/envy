import type { Field } from "./core/field";
import type {
  BigIntOptions,
  BooleanOptions,
  EmailOptions,
  EnumOptions,
  HostOptions,
  JsonOptions,
  NumberOptions,
  PortOptions,
  StringOptions,
  UrlOptions,
} from "./core/types";
import { bigint } from "./parsers/bigint";
import { boolean } from "./parsers/boolean";
import { email } from "./parsers/email";
import { enumValue } from "./parsers/enum";
import { host } from "./parsers/host";
import { json } from "./parsers/json";
import { number } from "./parsers/number";
import { port } from "./parsers/port";
import { string } from "./parsers/string";
import { url } from "./parsers/url";

/**
 * Force `optional: true` onto an options object so the optional overload is
 * selected and the resulting field is typed `T | undefined`.
 */
function markOptional<const O extends object>(options: O | undefined): O & { optional: true } {
  return { ...options, optional: true } as O & { optional: true };
}

export interface OptionalString {
  (name: string): Field<string, string | undefined>;
  (name: string, options: StringOptions): Field<string, string | undefined>;
}

export interface OptionalNumber {
  (name: string): Field<number, number | undefined>;
  (name: string, options: NumberOptions): Field<number, number | undefined>;
}

export interface OptionalBoolean {
  (name: string): Field<boolean, boolean | undefined>;
  (name: string, options: BooleanOptions): Field<boolean, boolean | undefined>;
}

export interface OptionalBigint {
  (name: string): Field<bigint, bigint | undefined>;
  (name: string, options: BigIntOptions): Field<bigint, bigint | undefined>;
}

export interface OptionalUrl {
  (name: string): Field<URL, URL | undefined>;
  (name: string, options: UrlOptions): Field<URL, URL | undefined>;
}

export interface OptionalEnum {
  <const T extends readonly string[]>(
    name: string,
    values: T,
  ): Field<T[number], T[number] | undefined>;
  <const T extends readonly string[]>(
    name: string,
    values: T,
    options: EnumOptions<T>,
  ): Field<T[number], T[number] | undefined>;
}

export interface OptionalEmail {
  (name: string): Field<string, string | undefined>;
  (name: string, options: EmailOptions): Field<string, string | undefined>;
}

export interface OptionalHost {
  (name: string): Field<string, string | undefined>;
  (name: string, options: HostOptions): Field<string, string | undefined>;
}

export interface OptionalPort {
  (name: string): Field<number, number | undefined>;
  (name: string, options: PortOptions): Field<number, number | undefined>;
}

export interface OptionalJson {
  (name: string): Field<unknown, unknown | undefined>;
  (name: string, options: JsonOptions): Field<unknown, unknown | undefined>;
}

export const optionalString: OptionalString = function optionalString(
  name: string,
  options?: StringOptions,
): Field<string, string | undefined> {
  return string(name, markOptional(options));
};

export const optionalNumber: OptionalNumber = function optionalNumber(
  name: string,
  options?: NumberOptions,
): Field<number, number | undefined> {
  return number(name, markOptional(options));
};

export const optionalBoolean: OptionalBoolean = function optionalBoolean(
  name: string,
  options?: BooleanOptions,
): Field<boolean, boolean | undefined> {
  return boolean(name, markOptional(options));
};

export const optionalBigint: OptionalBigint = function optionalBigint(
  name: string,
  options?: BigIntOptions,
): Field<bigint, bigint | undefined> {
  return bigint(name, markOptional(options));
};

export const optionalUrl: OptionalUrl = function optionalUrl(
  name: string,
  options?: UrlOptions,
): Field<URL, URL | undefined> {
  return url(name, markOptional(options));
};

export const optionalEnum: OptionalEnum = function optionalEnum<const T extends readonly string[]>(
  name: string,
  values: T,
  options?: EnumOptions<T>,
): Field<T[number], T[number] | undefined> {
  return enumValue(name, values, markOptional(options));
};

export const optionalEmail: OptionalEmail = function optionalEmail(
  name: string,
  options?: EmailOptions,
): Field<string, string | undefined> {
  return email(name, markOptional(options));
};

export const optionalHost: OptionalHost = function optionalHost(
  name: string,
  options?: HostOptions,
): Field<string, string | undefined> {
  return host(name, markOptional(options));
};

export const optionalPort: OptionalPort = function optionalPort(
  name: string,
  options?: PortOptions,
): Field<number, number | undefined> {
  return port(name, markOptional(options));
};

export const optionalJson: OptionalJson = function optionalJson(
  name: string,
  options?: JsonOptions,
): Field<unknown, unknown | undefined> {
  return json(name, markOptional(options));
};

export const optional = {
  string: optionalString,
  number: optionalNumber,
  boolean: optionalBoolean,
  bigint: optionalBigint,
  url: optionalUrl,
  enum: optionalEnum,
  email: optionalEmail,
  host: optionalHost,
  port: optionalPort,
  json: optionalJson,
} as const;
