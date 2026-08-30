/**
 * Verifies the packed, published artifact end-to-end. This is the release gate
 * for package correctness — it tests the **tarball**, not the source tree.
 *
 *   1. Builds the project (`npm run build`).
 *   2. `npm pack`s it into a tarball.
 *   3. Asserts tarball contents (exactly the intended public files).
 *   4. Installs that tarball into a fresh temporary project.
 *   5. Runtime smoke: ESM import, CJS require, `envy-ts/load` from both, API +
 *      redaction behavior.
 *   6. TypeScript consumer matrix against the installed tarball:
 *      ESM (bundler / node16 / nodenext), CJS (.cts under node16 / nodenext),
 *      a type-less CJS package under nodenext, and legacy node10 resolution —
 *      each also importing `envy-ts/load`. Zero TS1471/TS1479/TS2307 allowed.
 *
 * Run after `bun run build` via:  bun run verify:package
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require2 = createRequire(import.meta.url);
// Resolve the local TypeScript compiler `tsc` script (devDependency).
const tscJs = require2.resolve("typescript/bin/tsc");

function run(cmd, args, cwd, options = {}) {
  return execFileSync(cmd, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    ...options,
  });
}

function runNode(scriptName, cwd, environment = {}) {
  return execFileSync(process.execPath, [scriptName], {
    cwd,
    encoding: "utf8",
    stdio: ["inherit", "inherit", "inherit"],
    env: { ...process.env, ...environment },
  });
}

function runTsc(projectDir, cwd) {
  return execFileSync(process.execPath, [tscJs, "-p", projectDir, "--noEmit"], {
    cwd,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

/** Every name in `all` must be present; forbidden prefixes must be absent. */
function assertTarballContents(files, tarballName) {
  const paths = files.map((f) => f.path);
  const required = [
    "package.json",
    "README.md",
    "LICENSE",
    "dist/index.js",
    "dist/index.cjs",
    "dist/index.d.ts",
    "dist/index.d.cts",
    "dist/load.js",
    "dist/load.cjs",
    "dist/load.d.ts",
    "dist/load.d.cts",
  ];
  const missing = required.filter((p) => !paths.includes(p));
  if (missing.length > 0) {
    throw new Error(`tarball is missing required files: ${missing.join(", ")}`);
  }

  // Exactly the public package contents: dist + README + LICENSE + package.json.
  const allowedRoots = new Set(["package.json", "README.md", "LICENSE", "dist/"]);
  const sneaky = paths.filter((p) => {
    if (allowedRoots.has(p)) return false;
    const rootPart = p.split("/")[0];
    return rootPart === "package.json" || rootPart === "README.md" || rootPart === "LICENSE"
      ? false
      : !allowedRoots.has(`${rootPart}/`);
  });
  if (sneaky.length > 0) {
    throw new Error(`tarball contains unexpected files: ${sneaky.join(", ")}`);
  }

  const forbidden = [
    "src/",
    "tests/",
    "examples/",
    "scripts/",
    "type-tests/",
    ".github/",
    ".opencode/",
    "node_modules/",
    "coverage/",
    "Master.md",
    "tsconfig.json",
    "tsup.config.ts",
    "vitest.config.ts",
    "biome.json",
    "bun.lock",
    "package-lock.json",
    ".gitignore",
  ];
  const violated = paths.filter((p) => forbidden.some((f) => p.startsWith(f)));
  if (violated.length > 0) {
    throw new Error(`tarball must not contain: ${violated.join(", ")}`);
  }

  // The loader must stay isolated; only importing the core must not drag it in.
  if (!paths.some((p) => p.startsWith("dist/chunk-"))) {
    throw new Error("tarball should contain a shared chunk (tsup splitting output)");
  }
  console.log(`Tarball contents OK (${paths.length} files): for ${tarballName}`);
}

const esmCheck = `
import assert from "node:assert/strict";
import {
  env,
  parseEnv,
  parseEnvOrThrow,
  fromProcessEnv,
  fromObject,
  EnvError,
  EnvMissingError,
  EnvParseError,
  EnvValidationError,
  EnvSchemaError,
} from "envy-ts";
import { loadEnv } from "envy-ts/load";

process.env.VERIFY_PORT = "8080";
process.env.VERIFY_DEBUG = "yes";
process.env.VERIFY_MODE = "prod";
process.env.VERIFY_URL = "https://example.com/path?q=1";
process.env.VERIFY_BAD_NUMBER = "not-a-number";
process.env.VERIFY_API_KEY = "not-a-number";
process.env.VERIFY_EMAIL = "not-an-email";

// Field makers never return values.
assert.equal(typeof env.number("VERIFY_PORT"), "object");
assert.equal(typeof env.string("VERIFY_X"), "object");

// env.config reads process.env, throws on the first failing variable,
// and returns an immutable typed object.
const config = env.config({
  port: env.number("VERIFY_PORT"),
  debug: env.boolean("VERIFY_DEBUG"),
  mode: env.enum("VERIFY_MODE", ["dev", "prod"]),
  site: env.url("VERIFY_URL"),
  fallback: env.string("VERIFY_FALLBACK", "hello"),
  defaulted: env.number("VERIFY_DEFAULTED", 7),
  maybe: env.optional.string("VERIFY_NOT_SET"),
});
assert.deepEqual(
  { ...config },
  {
    port: 8080,
    debug: true,
    mode: "prod",
    site: new URL("https://example.com/path?q=1"),
    fallback: "hello",
    defaulted: 7,
    maybe: undefined,
  },
);
assert.equal(config.site.pathname, "/path");
assert.ok(Object.isFrozen(config));

// Structured result API: all failures collected, machine-readable codes.
const result = parseEnv(
  {
    port: env.number("VERIFY_PORT"),
    missing: env.number("VERIFY_MISSING"),
    bad: env.number("VERIFY_BAD_NUMBER"),
    bounded: env.number("VERIFY_PORT", { max: 100 }),
    fallback: env.string("VERIFY_FALLBACK", "hello"),
    maybe: env.optional.string("VERIFY_NOT_SET"),
    key: env.number("VERIFY_API_KEY"),
    invalid: env.email("VERIFY_EMAIL"),
  },
  fromProcessEnv(),
);
assert.equal(result.success, false);
if (!result.success) {
  assert.equal(result.errors.port, undefined);
  assert.equal(result.errors.fallback, undefined);
  assert.equal(result.errors.maybe, undefined);
  assert.equal(result.errors.missing?.code, "missing");
  assert.equal(result.errors.bad?.code, "invalid_number");
  assert.equal(result.errors.bounded?.code, "validation");
  // BUG-002: secret-looking variables never echo their received value.
  assert.equal(result.errors.key?.code, "invalid_number");
  assert.equal(result.errors.key?.received, undefined);
  // Non-secret variables still render a received value.
  assert.equal(result.errors.invalid?.code, "invalid_email");
  assert.ok(typeof result.errors.invalid?.received === "string");
}

// parseEnvOrThrow with an explicit source.
const thrown = parseEnvOrThrow(
  { port: env.number("PORT", { min: 1 }) },
  fromObject({ PORT: "9090" }),
);
assert.equal(thrown.port, 9090);

// Error class hierarchy.
assert.ok(EnvMissingError.prototype instanceof EnvError);
assert.ok(EnvParseError.prototype instanceof EnvError);
assert.ok(EnvValidationError.prototype instanceof EnvError);
assert.ok(EnvSchemaError.prototype instanceof EnvError);

// loadEnv lives on the /load subpath and is still a function.
assert.equal(typeof loadEnv, "function");
assert.deepEqual(loadEnv({ path: "does-not-exist.env" }), {});

console.log("ESM consumer check passed");
`;

const cjsCheck = `
const assert = require("node:assert/strict");
const {
  env,
  parseEnv,
  parseEnvOrThrow,
  fromProcessEnv,
  EnvError,
  EnvMissingError,
  EnvParseError,
} = require("envy-ts");
const { loadEnv: loadEnvSubpath } = require("envy-ts/load");

process.env.VERIFY2_PORT = "1234";
process.env.VERIFY2_MODE = "dev";
process.env.VERIFY2_BAD = "nope";

const configSchema = {
  port: env.number("VERIFY2_PORT"),
  greeting: env.string("VERIFY2_GREETING", "hi"),
  on: env.boolean("VERIFY2_ON", { default: true }),
  mode: env.enum("VERIFY2_MODE", ["dev", "prod"]),
};
const config = env.config(configSchema);
assert.deepEqual(
  { ...config },
  { port: 1234, greeting: "hi", on: true, mode: "dev" },
);

// Result API relies on parseEnv even in CJS.
const result = parseEnv(
  {
    port: env.number("VERIFY2_PORT"),
    missing: env.number("VERIFY2_MISSING"),
    bad: env.number("VERIFY2_BAD"),
  },
  fromProcessEnv(),
);
assert.equal(result.success, false);
if (!result.success) {
  assert.equal(result.errors.missing?.code, "missing");
  assert.equal(result.errors.bad?.code, "invalid_number");
}

assert.equal(
  parseEnvOrThrow({ m: env.number("VERIFY2_DEFAULTED", 7) }, fromProcessEnv()).m,
  7,
);

let threw = false;
try {
  env.config({ m: env.number("VERIFY2_NOT_SET") });
} catch (err) {
  threw = err instanceof EnvError && err instanceof EnvMissingError;
}
assert.ok(threw, "required missing variable should throw EnvMissingError");

assert.equal(typeof loadEnvSubpath, "function");
assert.ok(EnvParseError);
console.log("CJS consumer check passed");
`;

/** Small positive type fixture used by every matrix subproject. */
const esmTypeFixture = `
import { env, parseEnv, parseEnvOrThrow, fromObject, EnvError } from "envy-ts";
import type { EnvErrorCode, Field, Parsed, EnvResult } from "envy-ts";
import { loadEnv, type LoadEnvOptions } from "envy-ts/load";

const required: Field<number> = env.number("PORT");
const optionalUndef: Field<number, number | undefined> = env.number("PORT", undefined);
const optionalFlag: Field<number, number | undefined> = env.number("PORT", { optional: true });
const withDefault: Field<number> = env.number("PORT", 3000);
const enumLit: Field<"a" | "b"> = env.enum("MODE", ["a", "b"] as const);

const cfg: Readonly<{ port: number }> = parseEnvOrThrow(
  { port: env.number("PORT", 3000) },
  fromObject({}),
);
const portNumber: number = cfg.port;

const result: EnvResult<{ p: Field<number> }> = parseEnv({ p: env.number("P") }, { P: "1" });
let n: number = 0;
if (result.success) {
  n = result.env.p;
}

const parsed: Parsed<{ v: Field<string> }> = { v: "x" };
const code: EnvErrorCode = "missing";
const err: EnvError = new EnvError("message", "missing");
const load: typeof loadEnv = loadEnv;
const loadOptions: LoadEnvOptions = { path: ".env", override: true, required: false };

void required;
void optionalUndef;
void optionalFlag;
void withDefault;
void enumLit;
void portNumber;
void n;
void parsed;
void code;
void err;
void load;
void loadOptions;
`;

/** CJS-flavored fixture (.cts / type-less CJS package). */
const cjsTypeFixture = `
import { env, parseEnv, parseEnvOrThrow, fromObject } from "envy-ts";
import envy = require("envy-ts");
import { loadEnv } from "envy-ts/load";
import type { EnvResult, Field, Parsed, EnvErrorCode } from "envy-ts";

const required: Field<number> = env.number("PORT");
const optionalUndef: Field<number, number | undefined> = env.number("PORT", undefined);
const optionalFlag: Field<number, number | undefined> = env.number("PORT", { optional: true });
const withDefault: Field<number> = env.number("PORT", 3000);
const other: Field<string> = envy.string("N");

const cfg: Readonly<{ port: number }> = parseEnvOrThrow(
  { port: env.number("PORT", 3000) },
  fromObject({}),
);
const portNumber: number = cfg.port;

const result: EnvResult<{ p: Field<number> }> = parseEnv({ p: env.number("P") }, { P: "1" });
let n: number = 0;
if (result.success) {
  n = result.env.p;
}

const parsed: Parsed<{ v: Field<string> }> = { v: "x" };
const code: EnvErrorCode = "missing";
const load: typeof loadEnv = loadEnv;

void required;
void optionalUndef;
void optionalFlag;
void withDefault;
void other;
void portNumber;
void n;
void parsed;
void code;
void load;
`;

/** node10 (legacy) fixture — exercises `types` field + `typesVersions`. */
const node10TypeFixture = `
import { env, parseEnvOrThrow, fromObject } from "envy-ts";
import { loadEnv } from "envy-ts/load";
import type { Field, Parsed, EnvErrorCode } from "envy-ts";

const required: Field<number> = env.number("PORT");
const optionalFlag: Field<number, number | undefined> = env.number("PORT", { optional: true });

const cfg: Readonly<{ port: number }> = parseEnvOrThrow(
  { port: env.number("PORT", 3000) },
  fromObject({}),
);
const portNumber: number = cfg.port;

const parsed: Parsed<{ v: Field<string> }> = { v: "x" };
const code: EnvErrorCode = "missing";
const load: typeof loadEnv = loadEnv;

void required;
void optionalFlag;
void portNumber;
void parsed;
void code;
void load;
`;

function tsconfigFor({ module, moduleResolution, filename }) {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        lib: ["ES2022"],
        // Consumers do not install @types/node; the fixtures avoid Node globals.
        strict: true,
        noImplicitAny: true,
        noUncheckedIndexedAccess: true,
        exactOptionalPropertyTypes: true,
        skipLibCheck: true,
        noEmit: true,
        module,
        moduleResolution,
      },
      include: [filename],
    },
    null,
    2,
  );
}

/** Create one consumer subproject and assert `tsc --noEmit` passes. */
function typeCheckProject(consumerDir, name, filename, content, tsconfig, envCtl = {}) {
  const dir = join(consumerDir, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, filename), content, "utf8");
  writeFileSync(join(dir, "tsconfig.json"), tsconfig, "utf8");
  try {
    runTsc(dir, consumerDir);
    console.log(`  PASS  ${name}`);
    void envCtl;
  } catch (error) {
    const detail = typeof error.stdout === "string" ? error.stdout : String(error);
    throw new Error(`TypeScript consumer "${name}" failed:\n${detail}`);
  }
}

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------

const build = spawnSync("npm", ["run", "build"], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "inherit", "pipe"],
  shell: true,
});
if (build.status !== 0) {
  process.stderr.write(build.stderr ?? `build failed with exit ${build.status}`);
  throw new Error("`npm run build` failed; verify:package aborts.");
}

const packOutput = run("npm", ["pack", "--json", "--silent"], root);
let packMeta;
try {
  const raw = packOutput.trim();
  // Some npm versions emit "npm notice" lines around the JSON payload.
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const jsonText = start >= 0 && end >= 0 ? raw.slice(start, end + 1) : raw;
  const parsed = JSON.parse(jsonText);
  // npm 12 emits an object keyed by package name; older npm emits an array.
  packMeta = Array.isArray(parsed) ? parsed[0] : Object.values(parsed)[0];
} catch {
  throw new Error(`could not parse npm pack --json output: ${packOutput.slice(0, 500)}`);
}
const { filename: tarballName, files } = packMeta;
const tarball = resolve(root, tarballName);

let consumerDir;
try {
  assertTarballContents(files, tarballName);

  consumerDir = mkdtempSync(join(tmpdir(), "envy-verify-"));

  run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error", tarball], consumerDir);

  // Runtime ESM + CJS (+ loader) smoke.
  writeFileSync(join(consumerDir, "check.mjs"), esmCheck, "utf8");
  writeFileSync(join(consumerDir, "check.cjs"), cjsCheck, "utf8");
  runNode("check.mjs", consumerDir);
  runNode("check.cjs", consumerDir);
  console.log("Runtime smoke passed (ESM + CJS + /load + redaction).");

  // TypeScript consumer matrix.
  const esm = tsconfigFor({ module: "esnext", moduleResolution: "bundler", filename: "check.mts" });
  const node16 = tsconfigFor({
    module: "node16",
    moduleResolution: "node16",
    filename: "check.mts",
  });
  const nodenext = tsconfigFor({
    module: "nodenext",
    moduleResolution: "nodenext",
    filename: "check.mts",
  });
  const cts16 = tsconfigFor({
    module: "node16",
    moduleResolution: "node16",
    filename: "check.cts",
  });
  const ctsNext = tsconfigFor({
    module: "nodenext",
    moduleResolution: "nodenext",
    filename: "check.cts",
  });
  const node10 = tsconfigFor({
    module: "commonjs",
    moduleResolution: "node10",
    filename: "check.ts",
  });

  typeCheckProject(consumerDir, "esm-bundler", "check.mts", esmTypeFixture, esm);
  typeCheckProject(consumerDir, "esm-node16", "check.mts", esmTypeFixture, node16);
  typeCheckProject(consumerDir, "esm-nodenext", "check.mts", esmTypeFixture, nodenext);
  typeCheckProject(consumerDir, "cjs-node16", "check.cts", cjsTypeFixture, cts16);
  typeCheckProject(consumerDir, "cjs-nodenext", "check.cts", cjsTypeFixture, ctsNext);
  typeCheckProject(consumerDir, "node10", "check.ts", node10TypeFixture, node10);

  // A type-less CJS package under nodenext: `.ts` files in a package without
  // `"type": "module"` are CommonJS, so `envy-ts` must resolve via the
  // `require` condition to `index.d.cts`.
  const typeLessDir = join(consumerDir, "type-less-cjs");
  mkdirSync(typeLessDir, { recursive: true });
  writeFileSync(join(typeLessDir, "package.json"), "{}\n", "utf8");
  writeFileSync(join(typeLessDir, "check.ts"), cjsTypeFixture, "utf8");
  writeFileSync(
    join(typeLessDir, "tsconfig.json"),
    tsconfigFor({ module: "nodenext", moduleResolution: "nodenext", filename: "check.ts" }),
    "utf8",
  );
  try {
    runTsc(typeLessDir, consumerDir);
    console.log("  PASS  type-less-cjs (nodenext)");
  } catch (error) {
    const detail = typeof error.stdout === "string" ? error.stdout : String(error);
    throw new Error(`TypeScript consumer "type-less-cjs" failed:\n${detail}`);
  }

  console.log(`Package verified: ${tarballName} imports cleanly from ESM and CJS.`);
  console.log("Consumer type matrix passed: bundler, node16-ESM, nodenext-ESM,");
  console.log("node16-CJS, nodenext-CJS, type-less CJS, node10 legacy (incl. /load).");
} finally {
  if (consumerDir) rmSync(consumerDir, { recursive: true, force: true });
  rmSync(tarball, { force: true });
}
