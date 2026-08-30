<h1 align="center">Security Policy</h1>

<p align="center">
  <i><code>envy-ts</code> is a tiny, zero-runtime-dependency environment-variable parser. Its security posture is deliberately narrow — and documented below, in full.</i>
</p>

> **If you believe you have found a vulnerability, do not open a public issue.**
> Report it privately. See [Reporting a vulnerability](#reporting-a-vulnerability).

---

## Supported versions

| Version | Supported |
|---|---|
| 1.x | ✅ |

Only the current `1.x` line receives security fixes.

---

## Reporting a vulnerability

**Do not open public issues for suspected security vulnerabilities.**

If this repository is hosted on GitHub, report vulnerabilities privately via the
**Security tab → "Report a vulnerability"** (GitHub Security Advisory). That
flow delivers the report only to the maintainers and is the fastest path to a
coordinated fix.

If a GitHub Security Advisory flow is not available, contact the maintainers
directly and **do not** include real secret values in the report — synthetic or
representative samples are sufficient.

> What to expect: the report goes straight to maintainers, it is handled in
> private, and it is only disclosed once a fix is coordinated.

### What we want to hear about

- secret values leaking through any error path, test, snapshot, artifact, or
  documentation;
- prototype-pollution paths through schema keys or parse outputs;
- crash paths in the non-throwing `parseEnv` API (including adversarial source
  and schema shapes);
- incorrect type/declaration resolution that misleads consumers.

---

## Security boundaries

These are the properties `envy-ts` guarantees — and tests lock them in.

### The library never logs

`envy-ts` performs no I/O except the explicit `loadEnv` file read, and it never
writes to logs, stdout, or stderr. Sensitive values therefore cannot "leak via
logging" — because the library does not log at all.

### Secret redaction is a contract

Values of variables whose name contains a secret keyword segment
(`PASSWORD`, `PASSWD`, `SECRET`, `TOKEN`, `KEY`, `CREDENTIAL`, `PRIVATE`,
`AUTH`, `SALT`) — or that are marked `secret: true` — are **never** echoed in
error messages, thrown errors, or result errors. Non-secret values are echoed
quoted and truncated to at most 40 characters.

### The parser never throws for library-level failures

`parseEnv` aggregates library-level failures (missing, parse, validation,
schema) into structured results instead of throwing. Malformed schemas and
malformed source shapes produce structured errors, never raw `TypeError`s.
Prototype-chain reads (`__proto__`, `toString`, `constructor`, …) resolve only
against **own properties**, so no field name can escape into inherited
properties or crash the engine.

### User exception boundary

Throwing getters on user-supplied source objects and throwing custom validators
are **user code** and propagate as-is. They are outside the library's error
classification by design: whoever controls a source or a validator already
controls execution.

### Loader scope

`loadEnv` reads an explicit path via `node:fs` and writes into `process.env`.
It is a dotenv-style loader, **not a sandbox**: parsing a file supplied by an
untrusted party is the consumer's prerogative. Multiline quoted values and
`${VAR}` interpolation are intentionally unsupported.

---

## What the library does not do

- No dynamic evaluation (`eval`, `new Function`, `child_process`).
- No runtime dependency supply-chain surface (zero runtime dependencies).
- No automatic platform detection; adapters must be selected explicitly.
- No installation scripts.

---

## See also

- [CONTRIBUTING.md](./CONTRIBUTING.md) — the contribution guide and security-test
  conventions (adversarial behavior lives in `tests/security.test.ts`).
- [CHANGELOG.md](./CHANGELOG.md) — security-relevant changes are called out
  explicitly under each release.
