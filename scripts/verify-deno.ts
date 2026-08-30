/**
 * Deno smoke test (P1-05 / §13 DoD). Imports the **built** ESM core
 * (`dist/index.js`) from a file URL and exercises the parser, the core error
 * classes, `fromObject`, and the `fromDenoEnv` adapter as they behave inside a
 * real Deno runtime.
 *
 * The Node-only loader (`envy-ts/load`) is intentionally NOT part of this
 * smoke: it reads `node:fs`/`node:path` and is documented as unavailable in
 * bare Deno.
 *
 * Run with:  deno run --allow-env scripts/verify-deno.ts
 */
import {
  EnvError,
  env,
  fromDenoEnv,
  fromObject,
  parseEnv,
  parseEnvOrThrow,
} from "../dist/index.js";

const schema = {
  port: env.number("PORT", 80),
  mode: env.enum("MODE", ["dev", "prod"] as const, "dev"),
  name: env.string("NAME"),
};

const cfg = parseEnvOrThrow(schema, fromObject({ PORT: "8080", NAME: "deno" }));
if (cfg.port !== 8080 || cfg.mode !== "dev" || cfg.name !== "deno") {
  throw new Error("deno smoke: parseEnvOrThrow(fromObject) assertions failed");
}

const result = parseEnv({ required: env.number("MISSING") }, fromObject({}));
if (result.success) {
  throw new Error("deno smoke: expected a non-throwing failure for a missing variable");
}

// The result-error shape is plain and machine-readable under Deno too.
if (!result.success && result.errors.required?.code !== "missing") {
  throw new Error("deno smoke: unexpected missing-variable error shape");
}

// The Deno adapter reads the real ambient environment.
const denoEnv = fromDenoEnv();
if (typeof denoEnv !== "object" || denoEnv === null) {
  throw new Error("deno smoke: fromDenoEnv did not return an object");
}

const err: EnvError = new EnvError("deno smoke", "missing");
if (!(err instanceof Error) || err.code !== "missing") {
  throw new Error("deno smoke: EnvError hierarchy mismatch");
}

console.log("Deno smoke passed: core imports, parses, results, adapter, errors OK.");
