import { describe, expect, it } from "vitest";
import { EnvMissingError, EnvParseError, EnvValidationError, parseEnvOrThrow } from "../src";
import { bigint } from "../src/parsers/bigint";
import { parseValue, src } from "./helpers";

describe("bigint parser", () => {
  it.each(["0", "42", "-10", "99999999999999999999999999"])("parses %s", (raw) => {
    expect(parseValue(bigint("N"), { N: raw })).toBe(BigInt(raw));
  });

  it("handles large values beyond Number.MAX_SAFE_INTEGER", () => {
    expect(parseValue(bigint("N"), { N: "9007199254740993" })).toBe(9007199254740993n);
  });

  it("trims surrounding whitespace", () => {
    expect(parseValue(bigint("N"), { N: "  7  " })).toBe(7n);
  });

  it.each(["1.5", "abc", "0x10", "NaN", "1e3", "12 34"])("rejects %s", (raw) => {
    expect(() => parseEnvOrThrow({ value: bigint("N") }, src({ N: raw }))).toThrow(EnvParseError);
    expect(() => parseEnvOrThrow({ value: bigint("N") }, src({ N: raw }))).toThrow(
      /must be a bigint/,
    );
  });

  it("treats an empty value as missing", () => {
    expect(() => parseEnvOrThrow({ value: bigint("N") }, src({ N: "" }))).toThrow(EnvMissingError);
  });

  it("throws EnvMissingError when required and missing", () => {
    expect(() => parseEnvOrThrow({ value: bigint("N") }, src({}))).toThrow(EnvMissingError);
    expect(() => parseEnvOrThrow({ value: bigint("N") }, src({}))).toThrow(/Expected: a bigint/);
  });

  it("uses the default when missing", () => {
    expect(parseValue(bigint("N", 1000n), {})).toBe(1000n);
    expect(parseValue(bigint("N", { default: 2000n }), {})).toBe(2000n);
  });

  it("returns undefined when optional and missing", () => {
    expect(parseValue(bigint("N", undefined), {})).toBeUndefined();
  });

  it("enforces min and max", () => {
    expect(() => parseEnvOrThrow({ value: bigint("N", { min: 10n }) }, src({ N: "5" }))).toThrow(
      EnvValidationError,
    );
    expect(() => parseEnvOrThrow({ value: bigint("N", { max: 1n }) }, src({ N: "5" }))).toThrow(
      EnvValidationError,
    );
    expect(parseValue(bigint("N", { min: 1n, max: 10n }), { N: "5" })).toBe(5n);
  });
});
