import { describe, expect, it } from "vitest";
import { env, parseEnvOrThrow } from "../src";
import { parseValue, src } from "./helpers";

describe("optional namespace", () => {
  it("returns the value when present", () => {
    expect(parseValue(env.optional.string("NAME"), { NAME: "bob" })).toBe("bob");
    expect(parseValue(env.optional.number("N"), { N: "42" })).toBe(42);
    expect(parseValue(env.optional.boolean("B"), { B: "false" })).toBe(false);
    expect(parseValue(env.optional.bigint("BIG"), { BIG: "7" })).toBe(7n);
    expect(parseValue(env.optional.url("U"), { U: "https://a.b" })?.hostname).toBe("a.b");
    expect(parseValue(env.optional.enum("NAME", ["bob", "sue"] as const), { NAME: "bob" })).toBe(
      "bob",
    );
  });

  it("returns undefined when missing", () => {
    expect(parseValue(env.optional.string("NAME"), {})).toBeUndefined();
    expect(parseValue(env.optional.number("N"), {})).toBeUndefined();
    expect(parseValue(env.optional.boolean("B"), {})).toBeUndefined();
    expect(parseValue(env.optional.bigint("BIG"), {})).toBeUndefined();
    expect(parseValue(env.optional.url("U"), {})).toBeUndefined();
    expect(parseValue(env.optional.enum("X", ["a", "b"] as const), {})).toBeUndefined();
    expect(parseValue(env.optional.email("E"), {})).toBeUndefined();
    expect(parseValue(env.optional.host("H"), {})).toBeUndefined();
    expect(parseValue(env.optional.port("P"), {})).toBeUndefined();
    expect(parseValue(env.optional.json("J"), {})).toBeUndefined();
  });

  it("returns undefined for an empty value", () => {
    expect(parseValue(env.optional.string("NAME"), { NAME: "" })).toBeUndefined();
  });

  it("applies validation options", () => {
    expect(parseValue(env.optional.number("N", { min: 1 }), { N: "5" })).toBe(5);
    expect(() =>
      parseEnvOrThrow({ value: env.optional.number("N", { min: 1 }) }, src({ N: "0" })),
    ).toThrow(/at least 1/);
  });

  it("still throws for invalid present values", () => {
    expect(() =>
      parseEnvOrThrow({ value: env.optional.number("N") }, src({ N: "not-a-number" })),
    ).toThrow(/must be a number/);
  });

  it("lets the default win when optional and default are both set (Decision H)", () => {
    expect(parseValue(env.optional.string("NAME", { default: "d" }), {})).toBe("d");
    // Defaults win over optionality even when set through the base maker:
    const field = env.string("S", { optional: true, default: "fallback" });
    expect(parseValue(field, {})).toBe("fallback");
    // An explicitly present value still beats the default.
    expect(parseValue(env.optional.string("NAME", { default: "d" }), { NAME: "real" })).toBe(
      "real",
    );
  });
});
