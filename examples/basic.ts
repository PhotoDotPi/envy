/**
 * The most basic usage: read a few typed variables.
 *
 * `env.number(...)` etc. build pure field descriptors. `env.config` parses
 * them against the process environment into one immutable, typed object.
 *
 * Run with:  bun run examples/basic.ts
 */
import { env } from "../src";

const config = env.config({
  port: env.number("PORT", 3000),
  debug: env.boolean("DEBUG", false),
  apiUrl: env.string("API_URL", "https://api.example.com"),
  nodeEnv: env.enum("NODE_ENV", ["development", "production", "test"] as const, "development"),
});

console.log(config);
console.log(`Server would start on port ${config.port} with debug=${config.debug}`);
