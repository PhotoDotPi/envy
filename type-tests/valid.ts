/**
 * POSITIVE type test: this file MUST compile under strict + exact-optional +
 * noUncheckedIndexedAccess. Compile with `tsc -p type-tests/tsconfig.valid.json`
 * (expected exit 0).
 */

import type { Field, Parsed } from "../src";
import { env, parseEnv, parseEnvOrThrow } from "../src";

// Simple assignability checks that would fail loudly if inference were wrong.
const port: number = parseEnvOrThrow({ value: env.number("PORT", 3000) }, { PORT: "1" }).value;
const name: string = parseEnvOrThrow({ value: env.string("NAME") }, { NAME: "x" }).value;
const debug: boolean = parseEnvOrThrow({ value: env.boolean("DEBUG", false) }, {}).value;
const big: bigint = parseEnvOrThrow({ value: env.bigint("MAX", 1n) }, {}).value;
const url: URL = parseEnvOrThrow({ value: env.url("U", "https://x.com") }, {}).value;
const mode: "a" | "b" = parseEnvOrThrow(
  { value: env.enum("MODE", ["a", "b"] as const) },
  { MODE: "a" },
).value;

// Optional fields flow `| undefined`.
const maybe: string | undefined = parseEnvOrThrow({ value: env.optional.string("OPT") }, {}).value;

// Whole schema config shape infers precisely and is readonly.
const cfg = env.config({
  port: env.number("PORT", 3000),
  debug: env.boolean("DEBUG", false),
  name: env.string("NAME"),
  logLevel: env.optional.string("LOG"),
});
const cfgPort: number = cfg.port;
const cfgDebug: boolean = cfg.debug;
const cfgName: string = cfg.name;
const cfgLog: string | undefined = cfg.logLevel;
const _cfgReadonlyCheck: Readonly<{ port: number }> = cfg;

// enum literal union is preserved, not widened.
const ans = parseEnv({ v: env.enum("V", ["x", "y"] as const, { default: "x" }) }, {});
if (ans.success) {
  const v: "x" | "y" = ans.env.v;
  void v;
}

// New validators.
const email: string = parseEnvOrThrow({ value: env.email("E", "a@b.co") }, {}).value;
const host: string = parseEnvOrThrow({ value: env.host("H", "localhost") }, {}).value;
const p: number = parseEnvOrThrow({ value: env.port("P", 80) }, {}).value;

// Result API narrowing.
const res = parseEnv({ n: env.number("N") }, { N: "5" });
if (res.success) {
  const n: number = res.env.n;
  void n;
} else {
  const code: string = res.errors.n?.code ?? "";
  void code;
}

// Field descriptor overloads are precise (task §13).
const fieldRequired: Field<number> = env.number("X");
const fieldOptionalUndefined: Field<number, number | undefined> = env.number("X", undefined);
const fieldOptionalFlag: Field<number, number | undefined> = env.number("X", { optional: true });
const fieldBareDefault: Field<number> = env.number("X", 1);
const fieldOptionsDefault: Field<number> = env.number("X", { default: 1 });
const fieldOptionalOut: Field<string, string | undefined> = env.optional.string("X");
const fieldEnumLiteral: Field<"a" | "b"> = env.enum("E", ["a", "b"] as const);
const plainModes: string[] = ["a", "b"];
const fieldEnumStringArray: Field<string> = env.enum("E", plainModes);

// `Parsed<...>` must never degrade to `any` for any key.
type IsAny<T> = 0 extends 1 & T ? true : false;
type ExpectNotAny<T> = IsAny<T> extends true ? [never] : [true];
const phoneField = env.number("PHONE");
const _parsedNoAny: ExpectNotAny<Parsed<{ value: Field<number> }>> = [true];
const _parsedFieldValueNoAny: ExpectNotAny<Field<number>["__out"]> = [true];
void phoneField;

void port;
void name;
void debug;
void big;
void url;
void mode;
void maybe;
void cfgPort;
void cfgDebug;
void cfgName;
void cfgLog;
void _cfgReadonlyCheck;
void email;
void host;
void p;
void fieldRequired;
void fieldOptionalUndefined;
void fieldOptionalFlag;
void fieldBareDefault;
void fieldOptionsDefault;
void fieldOptionalOut;
void fieldEnumLiteral;
void fieldEnumStringArray;
void _parsedNoAny;
void _parsedFieldValueNoAny;
