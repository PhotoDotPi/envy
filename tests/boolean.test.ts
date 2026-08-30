import { describe, expect, it } from "vitest";
import { EnvMissingError, EnvParseError, parseEnvOrThrow } from "../src";
import { boolean } from "../src/parsers/boolean";
import { parseValue, src } from "./helpers";

const TRUTHY = new Set(["true", "1", "yes", "on"]);

describe("boolean parser", () => {
  it.each([
    ["true", true],
    ["false", false],
    ["1", true],
    ["0", false],
    ["yes", true],
    ["no", false],
    ["on", true],
    ["off", false],
  ] as const)("parses %s as %s", (raw, expected) => {
    expect(parseValue(boolean("B"), { B: raw })).toBe(expected);
  });

  it.each(["TRUE", "True", "trUe", "YES", "On", "OFF", "FALSE"])(
    "is case-insensitive for %s",
    (raw) => {
      const lower = raw.toLowerCase();
      const expected = TRUTHY.has(lower);
      expect(parseValue(boolean("B"), { B: raw })).toBe(expected);
    },
  );

  it("trims surrounding whitespace", () => {
    expect(parseValue(boolean("B"), { B: "  true  " })).toBe(true);
  });

  it.each(["2", "maybe", "truee", "truthy", "falsey"])("rejects %s", (raw) => {
    expect(() => parseEnvOrThrow({ value: boolean("B") }, src({ B: raw }))).toThrow(EnvParseError);
  });

  it("treats an empty value as missing", () => {
    expect(() => parseEnvOrThrow({ value: boolean("B") }, src({ B: "" }))).toThrow(EnvMissingError);
  });

  it("does not rely on Boolean(value) coercion", () => {
    expect(parseValue(boolean("B"), { B: "false" })).toBe(false);
  });

  it("throws EnvMissingError when required and missing", () => {
    expect(() => parseEnvOrThrow({ value: boolean("B") }, src({}))).toThrow(EnvMissingError);
  });

  it("uses the default when missing or empty", () => {
    expect(parseValue(boolean("B", false), { B: "" })).toBe(false);
    expect(parseValue(boolean("B", { default: true }), { B: "" })).toBe(true);
  });

  it("returns undefined when optional and missing", () => {
    expect(parseValue(boolean("B", undefined), {})).toBeUndefined();
    expect(parseValue(boolean("B", { optional: true }), {})).toBeUndefined();
  });
});
