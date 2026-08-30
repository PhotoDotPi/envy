import { describe, expect, it } from "vitest";
import { env, parseEnv, parseEnvOrThrow } from "../src";
import { withEnv } from "./helpers";

const schema = {
  PORT: env.number("PORT", 3000),
  HOST: env.string("HOST"),
  DEBUG: env.boolean("DEBUG", false),
  MODE: env.enum("MODE", ["dev", "prod"] as const),
};

describe("result-based API (IMP-006)", () => {
  it("returns success:true with the parsed env", () => {
    const result = parseEnv(schema, { PORT: "8080", HOST: "x", DEBUG: "1", MODE: "dev" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.env).toEqual({ PORT: 8080, HOST: "x", DEBUG: true, MODE: "dev" });
      expect(Object.isFrozen(result.env)).toBe(true);
    }
  });

  it("returns success:false with per-variable errors", () => {
    const result = parseEnv(schema, { PORT: "abc", MODE: "nope" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.PORT?.code).toBe("invalid_number");
      expect(result.errors.PORT?.message).toContain("must be a number");
      expect(result.errors.PORT?.expected).toBe("a number");
      expect(result.errors.MODE?.code).toBe("invalid_enum");
      // HOST is missing entirely
      expect(result.errors.HOST?.code).toBe("missing");
      // DEBUG is absent but has a default, and no other error: not present
      expect(result.errors.DEBUG).toBeUndefined();
    }
  });

  it("does not throw on failure", () => {
    expect(() => parseEnv(schema, { PORT: "abc" })).not.toThrow();
  });

  it("machines-readable codes are stable and human messages present", () => {
    const r = parseEnv({ a: env.number("A") }, { A: "x" });
    if (!r.success) {
      expect(typeof r.errors.a?.code).toBe("string");
      expect(r.errors.a?.message.length).toBeGreaterThan(0);
    }
  });

  it("env.result reads process.env and returns a result", () => {
    const restore = withEnv({ PORT: "1234", HOST: "h", MODE: "prod" });
    try {
      const result = env.result({
        port: env.number("PORT"),
        mode: env.enum("MODE", ["dev", "prod"] as const),
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.env.port).toBe(1234);
    } finally {
      restore();
    }
  });
});

describe("aggregation (IMP-007)", () => {
  it("surfaces every invalid/missing variable at once", () => {
    const result = parseEnv(
      {
        a: env.number("A"),
        b: env.number("B"),
        c: env.number("C"),
      },
      { A: "abc", C: "xyz" },
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.a?.code).toBe("invalid_number");
      expect(result.errors.b?.code).toBe("missing");
      expect(result.errors.c?.code).toBe("invalid_number");
    }
  });

  it("throws the first error in schema order via the throwing API", () => {
    try {
      parseEnvOrThrow(
        {
          a: env.number("A"),
          b: env.number("B"),
        },
        { A: "abc", B: "xyz" },
      );
      expect.unreachable();
    } catch (error) {
      expect((error as { code: string }).code).toBe("invalid_number");
      expect((error as { variable?: string }).variable).toBe("A");
    }
  });

  it("shares the same engine between throwing and result APIs", () => {
    const bad = { A: "abc", B: "def" };
    const viaThrow = (() => {
      try {
        parseEnvOrThrow({ a: env.number("A"), b: env.number("B") }, bad);
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    })();
    const viaResult = parseEnv({ a: env.number("A"), b: env.number("B") }, bad);
    expect(viaThrow).toContain("must be a number");
    if (!viaResult.success) {
      expect(viaResult.errors.a?.message).toContain("must be a number");
    }
  });
});
