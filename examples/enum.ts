/**
 * Using enums to keep stringly-typed configuration safe.
 *
 * Run with:  NODE_ENV=production bun run examples/enum.ts
 */
import { env, parseEnvOrThrow } from "../src";

const config = parseEnvOrThrow(
  {
    mode: env.enum("NODE_ENV", ["development", "production", "test"] as const),
    region: env.enum("REGION", ["us-east-1", "eu-west-1", "ap-southeast-2"] as const, "eu-west-1"),
  },
  process.env,
);

// `config.mode` is "development" | "production" | "test" -- not string.
switch (config.mode) {
  case "development":
    console.log("Running in development mode.");
    break;
  case "production":
    console.log("Running in production mode.");
    break;
  case "test":
    console.log("Running in test mode.");
    break;
}

console.log(`Deploying to ${config.region}`);
