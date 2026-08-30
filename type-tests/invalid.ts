/**
 * NEGATIVE type test. Each `@ts-expect-error` line MUST produce a compile error.
 * If any line compiles without error, `@ts-expect-error` is unused and tsc fails,
 * so a correct library keeps this file failing exactly on the marked lines.
 * Compile with `tsc -p type-tests/tsconfig.invalid.json`.
 */
import { env, parseEnvOrThrow } from "../src";

const parsed = parseEnvOrThrow({ value: env.number("N", 1) }, { N: "1" });
const n = parsed.value;

// 1. number is not assignable to string
// @ts-expect-error number is not assignable to string
const bad1: string = n;

const m = parseEnvOrThrow({ value: env.enum("M", ["a", "b"] as const) }, { M: "a" }).value;

// 2. enum literal union is not assignable to an unrelated literal
// @ts-expect-error "a" | "b" is not assignable to "nope"
const bad2: "nope" = m;

// 3. wrong-type default is rejected
// @ts-expect-error string default is not a valid number default
const bad3 = env.number("N", "not-a-number");

// 4. unknown config key access is rejected
const c = env.config({ p: env.number("N") });
// @ts-expect-error property does not exist
const bad4: string = c.nonexistent;

// 5. mutation of a required non-optional field is rejected (readonly)
// @ts-expect-error config output is readonly
c.p = 5;

// 6. null is not a valid default/options argument
// @ts-expect-error null is not assignable to a default value or options object
const bad6 = env.string("X", null);

// 7. an enum default must be one of the allowed literal values
// @ts-expect-error "nope" is not one of "a" | "b"
const bad7 = env.enum("E", ["a", "b"] as const, "nope");

// 8. a non-Field schema entry is rejected
// @ts-expect-error a number is not a Field descriptor
const bad8 = parseEnvOrThrow({ value: 5 }, {});

// 9. a string default is not a valid boolean default
// @ts-expect-error string default is not assignable to boolean
const bad9 = env.boolean("B", "yes");

// 10. a string default is not a valid bigint default
// @ts-expect-error string default is not assignable to bigint
const bad10 = env.bigint("BI", "1");

void bad1;
void bad2;
void bad3;
void bad4;
void bad6;
void bad7;
void bad8;
void bad9;
void bad10;
