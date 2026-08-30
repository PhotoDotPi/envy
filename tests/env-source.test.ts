import { describe, expect, it } from "vitest";
import { env, parseEnv, parseEnvOrThrow } from "../src";
import { parseValue } from "./helpers";

const schema = {
  PORT: env.number("PORT", 3000),
  NAME: env.string("NAME"),
  DEBUG: env.boolean("DEBUG", false),
};

describe("environment source injection (BUG-004)", () => {
  it("parses from a plain object without touching process.env", () => {
    expect(parseValue(env.number("PORT"), { PORT: "3000" })).toBe(3000);
  });

  it("works with a normal object", () => {
    const result = parseEnv(schema, { PORT: "8080", NAME: "x", DEBUG: "true" });
    expect(result).toEqual({
      success: true,
      env: { PORT: 8080, NAME: "x", DEBUG: true },
    });
  });

  it("works with a frozen object", () => {
    const source = Object.freeze({ PORT: "8080", NAME: "x" });
    expect(parseEnvOrThrow(schema, source).PORT).toBe(8080);
  });

  it("works with Object.create(null)", () => {
    const source = Object.assign(Object.create(null) as Record<string, string>, {
      PORT: "8080",
      NAME: "x",
    });
    expect(parseEnvOrThrow(schema, source).NAME).toBe("x");
  });

  it("treats missing values as missing", () => {
    const result = parseEnv({ n: env.number("N") }, {});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.n?.code).toBe("missing");
  });

  it("treats empty values as missing", () => {
    const result = parseEnv({ n: env.number("N", 5) }, { N: "" });
    if (result.success) expect(result.env.n).toBe(5);
  });

  it("handles repeated parsing deterministically", () => {
    expect(parseEnvOrThrow(schema, { PORT: "1", NAME: "a" }).PORT).toBe(1);
    expect(parseEnvOrThrow(schema, { PORT: "2", NAME: "b" }).PORT).toBe(2);
    expect(parseEnvOrThrow(schema, { PORT: "1", NAME: "a" }).PORT).toBe(1);
  });

  it("does not mutate the source", () => {
    const source = { PORT: "8080", NAME: "x" };
    const snapshot = { ...source };
    parseEnv(schema, source);
    expect(source).toEqual(snapshot);
  });

  it("reflects source mutation between parses", () => {
    const source = { N: "1" };
    expect(parseEnvOrThrow({ n: env.number("N") }, source).n).toBe(1);
    source.N = "2";
    expect(parseEnvOrThrow({ n: env.number("N") }, source).n).toBe(2);
  });

  it("parses optional and default-filled keys", () => {
    const result = parseEnv(schema, { NAME: "only-required" });
    expect(result).toEqual({
      success: true,
      env: { PORT: 3000, NAME: "only-required", DEBUG: false },
    });
  });

  it("aggregates all failures in one parse", () => {
    const result = parseEnv(schema, { PORT: "not-a-number", DEBUG: "not-a-bool" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.PORT?.code).toBe("invalid_number");
      expect(result.errors.NAME?.code).toBe("missing");
      expect(result.errors.DEBUG?.code).toBe("invalid_boolean");
    }
  });

  it("redacts secret values in result errors", () => {
    const result = parseEnv({ token: env.string("API_TOKEN") }, { API_TOKEN: "abc" });
    // API_TOKEN parses as a string fine, so force a parse failure via number:
    const r2 = parseEnv({ token: env.number("API_TOKEN") }, { API_TOKEN: "abc" });
    expect(r2.success).toBe(false);
    if (!r2.success) {
      expect(r2.errors.token?.received).toBeUndefined();
      expect(r2.errors.token?.message).not.toContain("abc");
      expect(r2.errors.token?.message).not.toContain("undefined");
    }
    void result;
  });
});
