/**
 * Validation: fail fast with a clear message instead of crashing later.
 *
 * Run with:  PORT=99999 bun run examples/validation.ts
 */
import { EnvError, env } from "../src";

try {
  const config = env.config({
    port: env.number("PORT", { default: 3000, min: 1, max: 65535 }),
    apiKey: env.string("API_KEY", {
      minLength: 8,
      custom: (value) => value.startsWith("sk-") || "must start with 'sk-'",
    }),
    logLevel: env.string("LOG_LEVEL", {
      default: "info",
      pattern: /^(debug|info|warn|error)$/,
    }),
  });
  console.log("Loaded configuration:", {
    port: config.port,
    apiKey: `${config.apiKey.slice(0, 3)}…`,
    logLevel: config.logLevel,
  });
} catch (error) {
  if (error instanceof EnvError) {
    console.error(`Configuration error (${error.name}): ${error.message}`);
  } else {
    throw error;
  }
}
