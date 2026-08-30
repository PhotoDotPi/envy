import { randomUUID } from "node:crypto";
/**
 * Adversarial / security test suite (P0-02, P0-03, P1-02, P1-07).
 *
 * Covers:
 * - prototype-chain field names against hostile source shapes (own-property
 *   reads only);
 * - malformed schema entries producing structured errors, never raw TypeErrors;
 * - prototype-pollution safety of public output objects;
 * - throwing getters and throwing validators (documented propagation);
 * - the full redaction contract (keywords, negatives, `secret: true`, and the
 *   40-character truncation boundary);
 * - the v1 immutability contract (frozen fields, plain frozen outputs).
 */
import { describe, expect, it } from "vitest";
import type { EnvSource } from "../src";
import {
  EnvError,
  EnvMissingError,
  type EnvParseError,
  EnvSchemaError,
  env,
  fromObject,
  isSensitiveName,
  parseEnv,
  parseEnvOrThrow,
  safeValue,
} from "../src";
import type { Field, Schema } from "../src/core/field";

/** Field names that resolve through the prototype chain on a plain object. */
const PROTOTYPE_KEYS = [
  "__proto__",
  "constructor",
  "prototype",
  "toString",
  "hasOwnProperty",
  "valueOf",
] as const;

/** A schema that owns `__proto__` as a literal key (safe construction). */
function schemaWithProtoKey<T>(field: Field<T>): Schema {
  return Object.fromEntries([["__proto__", field]]) as unknown as Schema;
}

describe("P0-02: own-property-only source reads", () => {
  it.each(PROTOTYPE_KEYS)("treats inherited '%s' as missing against {}", (key) => {
    const result = parseEnv({ value: env.string(key) }, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.value?.code).toBe("missing");
    }
  });

  it.each(PROTOTYPE_KEYS)("never crashes or leaks an inherited '%s' on a locked source", (key) => {
    for (const source of [Object.freeze({}), Object.seal({}), fromObject({})]) {
      const result = parseEnv({ value: env.string(key) }, source);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.errors.value?.code).toBe("missing");
    }
  });

  it.each(PROTOTYPE_KEYS)("reads an OWN '%s' value when the source owns it", (key) => {
    const source = Object.create(null) as Record<string, string>;
    source[key] = "own-value";
    expect(parseEnvOrThrow({ value: env.string(key) }, source).value).toBe("own-value");
  });

  it("reads own __proto__ when created via Object.fromEntries", () => {
    const source = Object.fromEntries([["__proto__", "own-protoval"]]);
    expect(parseEnvOrThrow({ value: env.string("__proto__") }, source).value).toBe("own-protoval");
  });

  it("treats a non-string own value as absent instead of crashing", () => {
    expect(() => parseEnv({ value: env.number("N") }, { N: 5 as unknown as string })).not.toThrow();
    const result = parseEnv({ value: env.number("N", 7) }, { N: 5 as unknown as string });
    expect(result.success).toBe(true);
    if (result.success) expect(result.env.value).toBe(7);
  });

  it("treats a null source as an empty source", () => {
    const result = parseEnv({ value: env.number("N") }, null as unknown as EnvSource);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.value?.code).toBe("missing");
  });

  it("keeps live-source semantics for own properties", () => {
    const source = { N: "1" };
    expect(parseEnvOrThrow({ n: env.number("N") }, source).n).toBe(1);
    source.N = "2";
    expect(parseEnvOrThrow({ n: env.number("N") }, source).n).toBe(2);
  });
});

describe("P0-03: malformed schema entries are structured errors", () => {
  it.each([null, undefined, 5, "x", [], true])(
    "parseEnv collects a %p schema entry as invalid_options",
    (bad) => {
      const schema = { value: bad } as unknown as Schema;
      expect(() => parseEnv(schema, {})).not.toThrow();
      const result = parseEnv(schema, {});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.value?.code).toBe("invalid_options");
        expect(result.errors.value?.message.length).toBeGreaterThan(0);
      }
    },
  );

  it.each([null, undefined, 5, "x", []])(
    "parseEnvOrThrow throws EnvSchemaError for a %p schema entry",
    (bad) => {
      const schema = { value: bad } as unknown as Schema;
      expect(() => parseEnvOrThrow(schema, {})).toThrow(EnvSchemaError);
      try {
        parseEnvOrThrow(schema, {});
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(EnvError);
        expect(error).toBeInstanceOf(EnvSchemaError);
        expect((error as EnvSchemaError).code).toBe("invalid_options");
      }
    },
  );

  it("still rejects empty names as schema errors", () => {
    const result = parseEnv({ value: env.string("") }, {});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.value?.code).toBe("invalid_options");
  });

  it("aggregates multiple malformed entries with valid ones", () => {
    const result = parseEnv(
      {
        ok: env.number("OK", 1),
        bad: null as unknown as Field<unknown>,
      },
      {},
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.ok).toBeUndefined();
      expect(result.errors.bad?.code).toBe("invalid_options");
    }
  });

  it("treats a non-object top-level schema as an empty schema", () => {
    for (const bad of [null, undefined, 5, "x"] as const) {
      const result = parseEnv(bad as unknown as Schema, {});
      expect(result.success).toBe(true);
      if (result.success) expect(Object.keys(result.env)).toEqual([]);
      expect(() => parseEnvOrThrow(bad as unknown as Schema, {})).not.toThrow();
    }
  });
});

describe("prototype pollution safety", () => {
  it("never pollutes Object.prototype through schema output keys", () => {
    const before = new Set(Object.keys(Object.prototype));
    const schema = Object.fromEntries([
      ["__proto__", env.string("V")],
      ["constructor", env.string("V")],
      ["prototype", env.string("V")],
    ]) as unknown as Schema;
    const result = parseEnvOrThrow(schema, { V: "x" });
    expect((result as unknown as Record<string, string>).__proto__).toBe("x");
    expect((result as unknown as Record<string, string>).constructor).toBe("x");
    expect((result as unknown as Record<string, string>).prototype).toBe("x");
    // Own properties on a plain object, not prototype lookups:
    expect(Object.hasOwn(result, "__proto__")).toBe(true);
    expect(Object.hasOwn(result, "constructor")).toBe(true);
    expect(Object.hasOwn(result, "prototype")).toBe(true);
    // Object.prototype gained nothing.
    expect(({} as { polluted?: unknown }).polluted).toBeUndefined();
    for (const key of Object.keys(Object.prototype)) {
      expect(before.has(key)).toBe(true);
    }
  });

  it("keeps __proto__ as a literal key safe on success outputs", () => {
    const result = parseEnv(schemaWithProtoKey(env.string("V")), { V: "lit" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.getOwnPropertyDescriptor(result.env, "__proto__")?.value).toBe("lit");
      expect((result.env as unknown as { polluted?: unknown }).polluted).toBeUndefined();
    }
  });

  it("stores failure meta for a __proto__ key without touching prototypes", () => {
    const result = parseEnv(schemaWithProtoKey(env.number("V")), {});
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = (result.errors as unknown as Record<string, { code?: string }>).__proto__;
      expect(err?.code).toBe("missing");
      expect(Object.hasOwn(Object.prototype, "V")).toBe(false);
    }
  });
});

describe("exception propagation boundary", () => {
  it("propagates throwing source getters instead of wrapping them (Decision L)", () => {
    const source: Record<string, string> = {};
    Object.defineProperty(source, "BOOM", {
      enumerable: true,
      get() {
        throw new Error("user code boom");
      },
    });
    let caught: unknown;
    try {
      parseEnv({ value: env.number("BOOM") }, source);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught).not.toBeInstanceOf(EnvError);
    expect((caught as Error).message).toBe("user code boom");
  });

  it("propagates throwing custom validators (Decision K)", () => {
    expect(() =>
      parseEnv(
        {
          value: env.string("S", {
            custom: () => {
              throw new Error("validator boom");
            },
          }),
        },
        { S: "x" },
      ),
    ).toThrow(/validator boom/);
  });
});

describe("redaction contract (Decision N)", () => {
  const KEYWORDS = [
    "PASSWORD",
    "PASSWD",
    "SECRET",
    "TOKEN",
    "KEY",
    "CREDENTIAL",
    "PRIVATE",
    "AUTH",
    "SALT",
  ] as const;

  it.each(KEYWORDS)("never echoes the value for a %s-named variable", (segment) => {
    const name = `DB_${segment}`;
    const secret = "SENSITIVE-DATA-123";
    const result = parseEnv({ value: env.number(name) }, { [name]: secret });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.value?.received).toBeUndefined();
      expect(result.errors.value?.message).not.toContain(secret);
    }
    try {
      parseEnvOrThrow({ value: env.number(name) }, { [name]: secret });
      expect.unreachable();
    } catch (error) {
      const err = error as EnvParseError;
      expect(err.received).toBeUndefined();
      expect(err.message).not.toContain(secret);
    }
  });

  it("keeps MONKEY and KEYBOARD values visible (false positives)", () => {
    expect(isSensitiveName("MONKEY")).toBe(false);
    expect(isSensitiveName("KEYBOARD")).toBe(false);
    for (const name of ["MONKEY", "KEYBOARD"]) {
      const result = parseEnv({ value: env.number(name) }, { [name]: "banana" });
      if (!result.success) {
        expect(result.errors.value?.received?.replace(/"/g, "")).toBe("banana");
        expect(result.errors.value?.message).toContain("banana");
      }
    }
  });

  it("honors the secret:true override on a non-sensitive name", () => {
    const name = `NON_SENSITIVE_${randomUUID().replace(/-/g, "")}`;
    const value = "must-not-leak";
    const result = parseEnv({ value: env.number(name, { secret: true }) }, { [name]: value });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.value?.received).toBeUndefined();
      expect(result.errors.value?.message).not.toContain(value);
    }
  });

  it("truncates non-secret values at exactly 40 characters", () => {
    const name = `VALUE_${randomUUID().replace(/-/g, "")}`;
    const fourty = "x".repeat(40);
    const fourtyOne = "x".repeat(41);
    // `safeValue` is the documented, stable way to render safe values.
    expect(safeValue(name, fourty)).toBe(fourty);
    expect(safeValue(name, fourtyOne)).toBe(`${"x".repeat(39)}…`);
    expect(safeValue(name, fourtyOne)?.length).toBe(40);
  });

  it("never includes values in missing errors", () => {
    const result = parseEnv({ value: env.number("ANY_REQUIRED_VAR") }, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.value?.message).not.toContain("ANY_REQUIRED_VAR=");
      expect(result.errors.value?.message).not.toMatch(/received/i);
    }
  });

  it("redacts validation errors for sensitive names", () => {
    const name = "PRIVATE_MIN";
    const result = parseEnv({ value: env.number(name, { min: 10 }) }, { [name]: "5" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.value?.message).not.toContain("5");
    }
  });
});

describe("v1 immutability contract (P1-07)", () => {
  it("freezes every field descriptor from every maker", () => {
    const fields = [
      env.string("S"),
      env.number("N"),
      env.boolean("B"),
      env.bigint("BI"),
      env.url("U", "https://example.com"),
      env.enum("E", ["a", "b"] as const),
      env.email("EM"),
      env.host("H"),
      env.port("P"),
      env.json("J"),
      env.optional.string("OS"),
    ];
    for (const field of fields) {
      expect(Object.isFrozen(field)).toBe(true);
    }
  });

  it("does not deep-freeze user-supplied options", () => {
    const options = { min: 1 };
    const field = env.number("N", options);
    void field;
    expect(Object.isFrozen(options)).toBe(false);
  });

  it("returns plain frozen output objects with normal behavior", () => {
    const result = parseEnvOrThrow(
      { port: env.number("PORT", 80), mode: env.enum("M", ["a", "b"] as const, "a") },
      {},
    );
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(typeof result.hasOwnProperty).toBe("function");
    expect(Object.hasOwn(result, "port")).toBe(true);
    expect(() => {
      (result as { port: number }).port = 999;
    }).toThrow(TypeError);
  });

  it("accepts a __proto__ literal output key on the plain frozen result", () => {
    const result = parseEnvOrThrow(schemaWithProtoKey(env.string("V")), { V: "x" });
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.hasOwn(result, "__proto__")).toBe(true);
    expect((result as unknown as Record<string, string>).__proto__).toBe("x");
  });

  it("does not pollute when a frozen schema is reused", () => {
    const schema = Object.freeze({ secretKey: env.string("MY_SECRET", "v") });
    const a = parseEnv(schema, {});
    const b = parseEnv(schema, {});
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.env.secretKey).toBe("v");
      expect(b.env.secretKey).toBe("v");
    }
  });
});

describe("malformed sources never crash the engine", () => {
  it("handles primitive sources as empty", () => {
    const sources = ["nope", 42, true] as unknown as EnvSource[];
    for (const source of sources) {
      const result = parseEnv({ value: env.number("N") }, source);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.errors.value?.code).toBe("missing");
    }
  });
});

describe("error-code contract", () => {
  it("uses the frozen invalid_options envelope for schema misuse", () => {
    const result = parseEnv({ value: {} as unknown as Field<unknown> }, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.value?.code).toBe("invalid_options");
    }
  });

  it("keeps EnvMissingError instances intact for adversarial names (P0-02)", () => {
    expect(() => parseEnvOrThrow({ value: env.number("__proto__") }, {})).toThrow(EnvMissingError);
    expect(() => parseEnvOrThrow({ value: env.number("hasOwnProperty") }, {})).toThrow(
      EnvMissingError,
    );
  });
});

describe("maker argument validation (P0-03 schema robustness)", () => {
  const requiredMakers = [
    ["string", () => env.string("V", null as unknown as string)],
    ["number", () => env.number("V", null as unknown as number)],
    ["boolean", () => env.boolean("V", null as unknown as boolean)],
    ["bigint", () => env.bigint("V", null as unknown as bigint)],
    ["url", () => env.url("V", null as unknown as URL)],
    ["email", () => env.email("V", null as unknown as string)],
    ["host", () => env.host("V", null as unknown as string)],
    ["port", () => env.port("V", null as unknown as number)],
    ["enum", () => env.enum("V", ["a"] as const, null as unknown as "a")],
  ] as const;

  it.each(requiredMakers)("rejects a null second argument for %s", (_name, make) => {
    expect(() => make()).toThrow(EnvSchemaError);
    expect(() => make()).toThrow(/got null/);
  });

  it("rejects an empty enum values list", () => {
    expect(() => env.enum("E", [] as const)).toThrow(EnvSchemaError);
  });

  it("rejects bigint min > max at call time", () => {
    expect(() => env.bigint("B", { min: 10n, max: 1n })).toThrow(EnvSchemaError);
  });

  it.each([
    ["email", () => env.email("E", { default: "a@b.co" })],
    ["host", () => env.host("H", { default: "localhost" })],
    ["port", () => env.port("P", { default: 8080 })],
    ["url", () => env.url("U", { default: "https://example.com" })],
    ["string", () => env.string("S", { default: "x" })],
  ] as const)("parses the %s options-with-default form", (_name, make) => {
    const field = make();
    expect(Object.isFrozen(field)).toBe(true);
    expect(parseEnvOrThrow({ value: field }, {}).value).toBeDefined();
  });

  it("stores description and example metadata on the frozen field", () => {
    const field = env.number("N", { description: "the port", example: "8080" });
    expect(Object.isFrozen(field)).toBe(true);
    expect(field.description).toBe("the port");
    expect(field.example).toBe("8080");
  });

  it("wraps a non-parse throw from a hand-built parse into EnvParseError", () => {
    const field = {
      kind: "field",
      name: "X",
      expected: "a number",
      parseCode: "invalid_number",
      parse: () => {
        throw new RangeError("engine blew up");
      },
    } as unknown as Field<number>;
    const result = parseEnv({ value: field }, { X: "1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.value?.code).toBe("invalid_number");
    }
  });

  it("supports secret metadata plus default on the same field", () => {
    const field = env.string("S", { default: "v", secret: true });
    expect(parseEnvOrThrow({ value: field }, {}).value).toBe("v");
  });
});
