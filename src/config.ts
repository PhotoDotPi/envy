import type { Schema } from "./core/field";
import { type EnvResult, type Parsed, parseEnv, parseEnvOrThrow } from "./core/parse";
import { fromProcessEnv } from "./core/source";

/**
 * Bundle several parsed fields into a single typed, immutable configuration
 * object by reading the ambient `process.env` and throwing on the first
 * invalid/missing variable.
 *
 * This is the process-environment convenience form of {@link parseEnvOrThrow}.
 *
 * @example
 * const config = env.config({
 *   port: env.number("PORT", 3000),
 *   nodeEnv: env.enum("NODE_ENV", ["development", "production"] as const),
 * })
 * // config.port: number  (frozen/immutable)
 */
export function envConfig<S extends Schema>(schema: S): Readonly<Parsed<S>> {
  return parseEnvOrThrow(schema, fromProcessEnv());
}

/**
 * Parse a schema against the ambient `process.env` and return a
 * non-throwing, aggregated {@link EnvResult}. Convenience form of
 * {@link parseEnv}.
 *
 * @example
 * const result = env.result({
 *   PORT: env.number("PORT", { min: 1 }),
 *   DATABASE_URL: env.string("DATABASE_URL"),
 * })
 */
export function envResult<S extends Schema>(schema: S): EnvResult<S> {
  return parseEnv(schema, fromProcessEnv());
}
