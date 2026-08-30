import { describe, expect, it } from "vitest";
import { EnvMissingError, EnvParseError, EnvValidationError, parseEnvOrThrow } from "../src";
import { number } from "../src/parsers/number";
import { parseValue, src } from "./helpers";

function readNumber(source: Record<string, string | undefined>) {
  return parseEnvOrThrow({ value: number("N") }, source);
}

describe("number parser", () => {
  it.each(["42", "3.14", "-10", "0", "1e3", "-2.5e2", "+7", ".5"])("parses %s", (raw) => {
    expect(parseValue(number("N"), { N: raw })).toBe(Number(raw));
  });

  it("trims surrounding whitespace", () => {
    expect(parseValue(number("N"), { N: "  42  " })).toBe(42);
  });

  it.each(["abc", "12abc", "NaN", "Infinity", "-Infinity", "0x10", "3.", "12,5", "   oops  "])(
    "rejects %s",
    (raw) => {
      expect(() => parseEnvOrThrow({ value: number("N") }, { N: raw })).toThrow(EnvParseError);
      expect(() => parseEnvOrThrow({ value: number("N") }, { N: raw })).toThrow(/must be a number/);
    },
  );

  it.each(["1e309", "1e400", "-1e400"])("rejects overflow %s that is not finite", (raw) => {
    expect(Number.isFinite(Number(raw))).toBe(false);
    expect(() => parseEnvOrThrow({ value: number("N") }, { N: raw })).toThrow(EnvParseError);
    expect(() => parseEnvOrThrow({ value: number("N", 5) }, { N: raw })).toThrow(EnvParseError);
  });

  it("supports scientific notation round-tripping", () => {
    expect(parseValue(number("N"), { N: "1.5e3" })).toBe(1500);
    expect(parseValue(number("N"), { N: "2E-2" })).toBe(0.02);
  });

  it("parses -0 numerically", () => {
    const value = parseValue(number("N"), { N: "-0" });
    expect(Object.is(value, -0)).toBe(true);
  });

  it("treats Unicode whitespace (e.g. NBSP) as trimable like JS trim", () => {
    expect(parseValue(number("N"), { N: "\u00A042\u3000" })).toBe(42);
  });

  it("treats empty and whitespace-only values as missing", () => {
    expect(() => readNumber({ N: "" })).toThrow(EnvMissingError);
    expect(() => readNumber({ N: "   " })).toThrow(EnvMissingError);
  });

  it("never returns NaN for 'NaN' even with a default", () => {
    expect(() => parseEnvOrThrow({ value: number("N", 42) }, src({ N: "NaN" }))).toThrow(
      EnvParseError,
    );
  });

  it("throws EnvMissingError when required and missing", () => {
    expect(() => readNumber({})).toThrow(EnvMissingError);
    expect(() => readNumber({})).toThrow(/Expected: a number/);
  });

  it("uses the default when missing", () => {
    expect(parseValue(number("N", 3000), {})).toBe(3000);
    expect(parseValue(number("N", { default: 3000 }), {})).toBe(3000);
  });

  it("returns undefined when optional and missing", () => {
    expect(parseValue(number("N", undefined), {})).toBeUndefined();
    expect(parseValue(number("N", { optional: true }), {})).toBeUndefined();
  });

  it("treats an empty value like a missing one", () => {
    expect(parseValue(number("N", 1), { N: "" })).toBe(1);
    expect(() => readNumber({ N: "" })).toThrow(EnvMissingError);
  });

  it("enforces min", () => {
    expect(() => parseEnvOrThrow({ value: number("N", { min: 1 }) }, src({ N: "0" }))).toThrow(
      EnvValidationError,
    );
    expect(() => parseEnvOrThrow({ value: number("N", { min: 1 }) }, src({ N: "0" }))).toThrow(
      /at least 1/,
    );
    expect(parseValue(number("N", { min: 1 }), { N: "5" })).toBe(5);
  });

  it("enforces max", () => {
    expect(() =>
      parseEnvOrThrow({ value: number("N", { default: 3000, max: 65535 }) }, src({ N: "70000" })),
    ).toThrow(EnvValidationError);
  });

  it("validates defaults too", () => {
    expect(() => parseEnvOrThrow({ value: number("N", { default: 0, min: 1 }) }, src({}))).toThrow(
      EnvValidationError,
    );
  });

  it("enforces integer", () => {
    expect(() =>
      parseEnvOrThrow({ value: number("N", { integer: true }) }, src({ N: "3.14" })),
    ).toThrow(/must be an integer/);
  });
});
