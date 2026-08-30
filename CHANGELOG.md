<h1 align="center">Changelog</h1>

<p align="center">
  <i>The full history of <code>envy-ts</code> — every release, every fix, tracked so you never have to guess what changed.</i>
</p>

<p align="center">
  <a href="LICENSE" title="MIT License"><img src="https://img.shields.io/badge/license-MIT-8250df?style=flat-square&labelColor=586069" alt="MIT license"/></a>
  <a href="https://keepachangelog.com/en/1.1.0/" title="Keep a Changelog"><img src="https://img.shields.io/badge/format-Keep_a_Changelog-2ea043?style=flat-square&labelColor=586069" alt="Keep a Changelog"/></a>
  <a href="https://semver.org/spec/v2.0.0.html" title="Semantic Versioning"><img src="https://img.shields.io/badge/versioning-SemVer-0969da?style=flat-square&labelColor=586069" alt="Semantic Versioning"/></a>
</p>

This changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Every entry
is written for a human — what changed, why, and what it means for you.

---

## Working tree

> The next release is being shaped right now. These changes are on `main` but not
> yet shipped.

```
status:  unreleased · on main · not yet tagged
```

### ✨ Added

- `Security.md`, `Contributing.md`, issue/PR templates, and this changelog.
- Adversarial security suite (`tests/security.test.ts`) covering prototype-chain
  field names, malformed schema entries, prototype-pollution safety, throwing
  getters/validators, and the full redaction contract.
- Adapter test suite (`tests/adapters.test.ts`) for `fromObject`,
  `fromProcessEnv`, `fromBunEnv`, `fromDenoEnv`, and `fromImportMetaEnv`.
- Packed-package TypeScript consumer matrix in `verify:package` (ESM bundler /
  node16 / nodenext, CJS `.cts` and type-less CJS under node16 / nodenext, and
  legacy node10 resolution — each with `envy-ts/load`).
- Deno smoke test (`scripts/verify-deno.ts`) and `verify:deno` script.
- `publint` and `esbuild` development dependencies.
- Enforced coverage gate (lines ≥ 95, statements ≥ 95, branches ≥ 90,
  functions ≥ 95) with type-only modules excluded from runtime coverage.
- Node 18 added to the CI matrix (engines floor).

### 🛠 Changed

- Fixed package `exports`: `require` now resolves to `.d.cts` and `import` to
  `.d.ts` (CJS TypeScript under `node16`/`nodenext` no longer errors).
  Added `typesVersions` so legacy `node10` consumers resolve `envy-ts/load`.
- Source reads are own-property-only (`Object.hasOwn`); inherited properties
  are never read as values.
- Schema entries that are `null`, primitives, or missing a string `name` now
  produce structured `invalid_options` schema errors instead of `TypeError`s.
- Success outputs are plain, frozen objects (built via `Object.fromEntries`),
  supporting literal `__proto__` keys without prototype pollution.
- Field descriptors are frozen at creation.
- The unused `parseCode` of the string parser is `invalid_options` (documented
  as unreachable for the built-in parser).
- Removed the dead `ConfigSchema` type and stale/no-op tests.
- Committed `package-lock.json` (removed from `.gitignore`) for a reproducible
  npm track.

### 🐛 Fixed

- `number` parser rejects overflowing values (`1e309`, `1e400`) that are not
  finite numbers.
- Non-string own source values are treated as absent instead of crashing.

### 🔒 Security

- No known vulnerabilities. Secret values never appear in errors, snapshots,
  or output; prototype pollution through schema keys is prevented and tested.

---

## v1.0.0 · August 2026

```
release:  v1.0.0 · 2026-08-30 · first public release · MIT
```

> The first stable release. `envy-ts` is deliberately small — one pure, auditable
> core that is excellent at the common case.

### ✨ Added

- Initial release of `envy-ts`.
- Zero-runtime-dependency, TypeScript-first environment variable parsing.
- Field makers: `env.string`, `env.number`, `env.boolean`, `env.bigint`,
  `env.url`, `env.enum`, `env.email`, `env.host`, `env.port`, `env.json`, and
  the `env.optional.*` namespace.
- Two parse APIs sharing one engine: `parseEnv` (non-throwing, aggregated,
  result-based) and `parseEnvOrThrow` (throws the first failure in schema
  order).
- Source adapters: `fromObject`, `fromProcessEnv`, `fromBunEnv`, `fromDenoEnv`,
  `fromImportMetaEnv`.
- Process-environment conveniences: `env.config` and `env.result`.
- A typed error hierarchy (`EnvError`, `EnvMissingError`, `EnvParseError`,
  `EnvValidationError`, `EnvSchemaError`) with a frozen machine-readable
  `EnvErrorCode` set.
- Automatic secret redaction: sensitive-named variables are never echoed in
  errors; non-secret values are truncated to 40 characters.
- Node-only `.env` loader on the `envy-ts/load` subpath (`loadEnv`).
- ESM + CommonJS runtime and declaration artifacts (`.d.ts` and `.d.cts`).
- Browser-safe pure core (no Node builtins, no `process` reads) verified by an
  esbuild bundle guard.
- Frozen, immutable parse outputs.
- MIT license.

---

## About this format

Each heading follows `[Keep a Changelog](https://keepachangelog.com/en/1.1.0/)`'s
categories — **Added**, **Changed**, **Fixed**, **Security** — and each release
is tagged with the [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
rules it follows.

The changelog is also the definitive place to verify claims made anywhere in the
repo: if it's in here, it is true. See [CONTRIBUTING.md](./CONTRIBUTING.md) for
what must be added to this file alongside a change.
