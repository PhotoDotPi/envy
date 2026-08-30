import { describe, expect, it } from "vitest";
import { EnvMissingError, EnvParseError, EnvValidationError, parseEnvOrThrow } from "../src";
import { port } from "../src/parsers/port";
import { parseValue } from "./helpers";

describe("port parser", () => {
  it.each(["0", "80", "443", "65535"])("accepts %s", (raw) => {
    expect(parseValue(port("PORT"), { PORT: raw })).toBe(Number(raw));
  });

  it("accepts and normalizes a leading-zero port", () => {
    expect(parseValue(port("PORT"), { PORT: "080" })).toBe(80);
    expect(parseValue(port("PORT"), { PORT: "0000" })).toBe(0);
  });

  it("trims surrounding whitespace", () => {
    expect(parseValue(port("PORT"), { PORT: "  8080  " })).toBe(8080);
  });

  it.each(["65536", "-1", "3.5", "abc", "1e3", "0x50", "12 34"])("rejects %s", (raw) => {
    expect(() => parseEnvOrThrow({ value: port("PORT") }, { PORT: raw })).toThrow(EnvParseError);
    expect(() => parseEnvOrThrow({ value: port("PORT") }, { PORT: raw })).toThrow(
      /must be a valid port/,
    );
  });

  it("treats an empty value as missing", () => {
    expect(() => parseEnvOrThrow({ value: port("PORT") }, { PORT: "" })).toThrow(EnvMissingError);
  });

  it("throws EnvMissingError when required and missing", () => {
    expect(() => parseEnvOrThrow({ value: port("PORT") }, {})).toThrow(EnvMissingError);
  });

  it("uses the default when missing", () => {
    expect(parseValue(port("PORT", 3000), {})).toBe(3000);
  });

  it("returns undefined when optional and missing", () => {
    expect(parseValue(port("PORT", undefined), {})).toBeUndefined();
  });

  it("rejects a default that is out of range", () => {
    expect(() => parseEnvOrThrow({ value: port("PORT", 70000) }, {})).toThrow(EnvValidationError);
  });
});
