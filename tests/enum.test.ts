import { describe, expect, expectTypeOf, it } from "vitest";
import { EnvMissingError, EnvParseError, parseEnvOrThrow } from "../src";
import { enumValue } from "../src/parsers/enum";
import { parseValue, src } from "./helpers";

const MODES = ["development", "production", "test"] as const;

describe("enum parser", () => {
  it("returns a valid value", () => {
    expect(parseValue(enumValue("NODE_ENV", MODES), { NODE_ENV: "production" })).toBe("production");
  });

  it("is case-sensitive", () => {
    expect(() =>
      parseEnvOrThrow({ value: enumValue("NODE_ENV", MODES) }, src({ NODE_ENV: "Production" })),
    ).toThrow(EnvParseError);
  });

  it("trims surrounding whitespace", () => {
    expect(parseValue(enumValue("NODE_ENV", MODES), { NODE_ENV: "  test  " })).toBe("test");
  });

  it.each(["local", "staging"])("rejects %s", (raw) => {
    expect(() =>
      parseEnvOrThrow({ value: enumValue("NODE_ENV", MODES) }, src({ NODE_ENV: raw })),
    ).toThrow(EnvParseError);
    expect(() =>
      parseEnvOrThrow({ value: enumValue("NODE_ENV", MODES) }, src({ NODE_ENV: raw })),
    ).toThrow(/one of:/);
  });

  it("treats an empty value as missing", () => {
    expect(() =>
      parseEnvOrThrow({ value: enumValue("NODE_ENV", MODES) }, src({ NODE_ENV: "" })),
    ).toThrow(EnvMissingError);
  });

  it("mentions the allowed values in the parse error", () => {
    expect(() =>
      parseEnvOrThrow({ value: enumValue("NODE_ENV", MODES) }, src({ NODE_ENV: "local" })),
    ).toThrow(/development/);
    expect(() =>
      parseEnvOrThrow({ value: enumValue("NODE_ENV", MODES) }, src({ NODE_ENV: "local" })),
    ).toThrow(/production/);
  });

  it("throws EnvMissingError when required and missing", () => {
    expect(() => parseEnvOrThrow({ value: enumValue("NODE_ENV", MODES) }, src({}))).toThrow(
      EnvMissingError,
    );
  });

  it("uses a default when missing", () => {
    expect(parseValue(enumValue("NODE_ENV", MODES, "development"), {})).toBe("development");
    expect(parseValue(enumValue("NODE_ENV", MODES, { default: "test" }), {})).toBe("test");
  });

  it("ignores the default when the variable is present", () => {
    expect(
      parseValue(enumValue("NODE_ENV", MODES, "development"), { NODE_ENV: "production" }),
    ).toBe("production");
  });

  it("returns undefined when default is undefined", () => {
    expect(parseValue(enumValue("NODE_ENV", MODES, undefined), {})).toBeUndefined();
  });

  it("infers the union of literal values", () => {
    const value = parseValue(enumValue("NODE_ENV", MODES), { NODE_ENV: "development" });
    expectTypeOf(value).toEqualTypeOf<"development" | "production" | "test">();
  });

  it("infers literals from a plain array (with as const)", () => {
    const modes = ["dev", "prod"] as const;
    const value = parseValue(enumValue("MODE", modes), { MODE: "dev" });
    expectTypeOf(value).toEqualTypeOf<"dev" | "prod">();
  });

  it("rejects an empty values array", () => {
    expect(() => enumValue("MODE", [])).toThrow(/must not be empty/);
  });

  it("accepts duplicate enum values (P2-02, no dedup semantics)", () => {
    expect(parseValue(enumValue("MODE", ["a", "a"] as const), { MODE: "a" })).toBe("a");
  });
});
