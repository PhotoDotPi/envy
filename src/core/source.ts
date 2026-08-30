/**
 * Environment source types and adapters.
 *
 * The pure parsing core (`parseEnv` / `parseEnvOrThrow`) consumes an
 * {@link EnvSource}: a plain object mapping variable names to string values.
 * It never touches `process.env`, `Bun.env`, `Deno.env` or `import.meta.env`
 * directly. The adapters below bridge a specific runtime's global environment
 * into the plain-object shape the core expects.
 */

/** A plain, runtime-agnostic environment source. */
export type EnvSource = Readonly<Record<string, string | undefined>>;

/**
 * Adapt any plain object into an {@link EnvSource}. This is the universal
 * way to feed an explicit source (a test fixture, a lambdas payload, etc.)
 * into {@link parseEnv}. The object is read by key and never mutated.
 *
 * Source semantics (part of the v1 contract):
 * - Sources are **live**: mutations between parses are observed at the next
 *   call. The core never snapshots a source.
 * - Reads resolve against **own properties only**. A source may set
 *   `__proto__`, `toString`, `constructor`, etc. as ordinary keys and they are
 *   read literally; inherited properties are never used as values.
 * - Non-string own values are treated as absent (the source contract is a
 *   string-keyed map).
 * - Throwing getters on a user-provided source propagate as user exceptions
 *   (the same boundary as throwing custom validators).
 */
export function fromObject(source: Record<string, string | undefined>): EnvSource {
  return source;
}

/**
 * Adapt the ambient `process.env` global (Node.js, Bun and Deno all expose
 * one). Only import this from Node-like runtimes; it is not part of the pure
 * browser-safe core.
 */
export function fromProcessEnv(): EnvSource {
  return process.env as EnvSource;
}

/**
 * Adapt Bun's `Bun.env`. Falls back to `process.env` when running under a
 * Node-like runtime. Returns an empty object when neither is available.
 */
export function fromBunEnv(): EnvSource {
  const bun = (globalThis as { Bun?: { env?: Record<string, string | undefined> } }).Bun;
  if (bun?.env !== undefined) return bun.env;
  if (typeof process !== "undefined" && process.env) return process.env as EnvSource;
  return {};
}

/**
 * Adapt the ambient `Deno.env`. Falls back to `process.env` when available.
 */
export function fromDenoEnv(): EnvSource {
  const deno = (globalThis as { Deno?: { env?: { get?: (k: string) => string | undefined } } })
    .Deno;
  if (deno?.env?.get !== undefined) {
    // Deno.env.toObject() exists on modern Deno; prefer it when present.
    const toObject = (deno.env as { toObject?: () => Record<string, string> }).toObject;
    if (toObject !== undefined) return toObject();
  }
  if (typeof process !== "undefined" && process.env) return process.env as EnvSource;
  return {};
}

/**
 * Adapt a `import.meta.env`-style object (as produced by Vite and friends)
 * into an {@link EnvSource}. Only string values are retained; values that are
 * not strings (e.g. booleans such as `DEV` / `PROD`) are the build tool's own
 * metadata and are not environment variables. The returned object is a fresh
 * copy — the input is not held by reference.
 */
export function fromImportMetaEnv(metaEnv: Record<string, unknown>): EnvSource {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(metaEnv)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}
