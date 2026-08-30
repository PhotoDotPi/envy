/**
 * `envy-ts` — tiny, zero-dependency, type-safe environment variable parsing.
 *
 * This is the pure, runtime-agnostic entry point. It imports no Node builtins,
 * so it can be bundled for the browser/edge without pulling in `fs` or `path`.
 *
 * Use {@link parseEnv} / {@link parseEnvOrThrow} with an explicit environment
 * source, or the `env.*` field makers together with `env.config` /
 * `env.result` for the ambient `process.env`. The Node-only `.env` loader is
 * available from the `envy-ts/load` subpath.
 *
 * @module envy-ts
 * @example
 * import { env } from "envy-ts";
 *
 * const config = env.config({
 *   port: env.number("PORT", 3000),
 *   nodeEnv: env.enum("NODE_ENV", ["development", "production"] as const),
 * });
 */

/** Parse a schema against the ambient process environment and throw on the first error. */
export { envConfig, envResult } from "./config";
export type { EnvErrorCode } from "./core/errors";
export {
  EnvError,
  EnvMissingError,
  EnvParseError,
  EnvSchemaError,
  EnvValidationError,
  isSensitiveName,
  safeValue,
} from "./core/errors";
export type { Field } from "./core/field";
export type { EnvErrors, EnvFieldError, EnvResult, Parsed, Schema } from "./core/parse";
export { parseEnv, parseEnvOrThrow } from "./core/parse";
export type { EnvSource } from "./core/source";
export {
  fromBunEnv,
  fromDenoEnv,
  fromImportMetaEnv,
  fromObject,
  fromProcessEnv,
} from "./core/source";
export type {
  BigIntOptions,
  BooleanOptions,
  CommonOptions,
  CustomValidator,
  EmailOptions,
  EnumOptions,
  HostOptions,
  JsonOptions,
  NumberOptions,
  PortOptions,
  StringOptions,
  UrlOptions,
} from "./core/types";
export { optional } from "./optional";
export { bigint } from "./parsers/bigint";
export { boolean } from "./parsers/boolean";
export { email } from "./parsers/email";
export { enumValue } from "./parsers/enum";
export { host } from "./parsers/host";
export { json } from "./parsers/json";
export { number } from "./parsers/number";
export { port } from "./parsers/port";
export { string } from "./parsers/string";
export { url } from "./parsers/url";

import { envConfig, envResult } from "./config";
import { optional } from "./optional";
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
 * The `env` namespace groups the pure field makers (which return
 * {@link Field} descriptors, never reading any environment) together with the
 * process-environment conveniences {@link env.config} and {@link env.result}.
 *
 * ```ts
 * const schema = {
 *   port: env.number("PORT", { default: 3000 }),
 *   nodeEnv: env.enum("NODE_ENV", ["development", "production"] as const),
 * }
 * const config = env.config(schema)   // reads process.env, throws, immutable
 * // or, with an explicit source:
 * const result = parseEnv(schema, { PORT: "8080" })
 * ```
 */
/** Convenience namespace for the library's field makers and environment helpers. */
export const env = {
  string,
  number,
  boolean,
  bigint,
  url,
  enum: enumValue,
  email,
  host,
  port,
  json,
  config: envConfig,
  result: envResult,
  optional,
} as const;

/** The inferred shape of the exported `env` namespace. */
export type Env = typeof env;

/** Default export: the same typed namespace as the named `env` export. */
export default env;
