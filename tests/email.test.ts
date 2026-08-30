import { describe, expect, it } from "vitest";
import { EnvMissingError, EnvParseError, parseEnvOrThrow } from "../src";
import { email } from "../src/parsers/email";
import { parseValue } from "./helpers";

describe("email parser", () => {
  it.each(["a@b.co", "user.name+tag@example.com", "x@sub.domain.org", "a-b@c-d.io"])(
    "accepts %s",
    (raw) => {
      expect(parseValue(email("E"), { E: raw })).toBe(raw);
    },
  );

  it("accepts consecutive domain dots (pragmatic validation, P2-01)", () => {
    expect(parseValue(email("E"), { E: "a@b..co" })).toBe("a@b..co");
  });

  it("trims surrounding whitespace", () => {
    expect(parseValue(email("E"), { E: "  a@b.co  " })).toBe("a@b.co");
  });

  it.each([
    "no-at",
    "@nouser.com",
    "user@novaliddomain",
    "user@.com",
    "a b@c.co",
    "user@domain.",
    "@",
  ])("rejects %s", (raw) => {
    expect(() => parseEnvOrThrow({ value: email("E") }, { E: raw })).toThrow(EnvParseError);
    expect(() => parseEnvOrThrow({ value: email("E") }, { E: raw })).toThrow(/valid email address/);
  });

  it("treats an empty value as missing", () => {
    expect(() => parseEnvOrThrow({ value: email("E") }, { E: "" })).toThrow(EnvMissingError);
  });

  it("throws EnvMissingError when required and missing", () => {
    expect(() => parseEnvOrThrow({ value: email("E") }, {})).toThrow(EnvMissingError);
  });

  it("uses the default when missing", () => {
    expect(parseValue(email("E", "a@b.co"), {})).toBe("a@b.co");
  });

  it("returns undefined when optional and missing", () => {
    expect(parseValue(email("E", undefined), {})).toBeUndefined();
  });

  it("enforces maxLength and custom", () => {
    expect(() =>
      parseEnvOrThrow({ value: email("E", { maxLength: 5 }) }, { E: "too@long.com" }),
    ).toThrow(/length must be at most/);
  });
});
