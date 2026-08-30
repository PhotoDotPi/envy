import { describe, expect, it } from "vitest";
import { EnvError, EnvValidationError, parseEnvOrThrow } from "../src";
import { enumValue } from "../src/parsers/enum";
import { number } from "../src/parsers/number";
import { string } from "../src/parsers/string";
import { parseValue, src } from "./helpers";

describe("validation", () => {
  it("enforces minLength and maxLength", () => {
    expect(() =>
      parseEnvOrThrow({ value: string("S", { maxLength: 5 }) }, src({ S: "toolongvalue" })),
    ).toThrow(EnvValidationError);
    expect(() =>
      parseEnvOrThrow({ value: string("S", { minLength: 20 }) }, src({ S: "toolongvalue" })),
    ).toThrow(/at least 20/);
    expect(parseValue(string("S", { minLength: 2, maxLength: 20 }), { S: "toolongvalue" })).toBe(
      "toolongvalue",
    );
  });

  it("applies a pattern", () => {
    expect(parseValue(string("S", { pattern: /^h/ }), { S: "hello" })).toBe("hello");
    expect(() =>
      parseEnvOrThrow({ value: string("S", { pattern: /^\d+$/ }) }, src({ S: "hello" })),
    ).toThrow(EnvValidationError);
    expect(() =>
      parseEnvOrThrow({ value: string("S", { pattern: /\d/ }) }, src({ S: "hello" })),
    ).toThrow(/must match/);
  });

  it("rejects a custom validator returning false", () => {
    expect(() =>
      parseEnvOrThrow({ value: string("S", { custom: () => false }) }, src({ S: "x" })),
    ).toThrow(/custom validation/);
  });

  it("uses the string returned by a custom validator as the reason", () => {
    expect(() =>
      parseEnvOrThrow(
        { value: string("S", { custom: () => "must be delicious" }) },
        src({ S: "x" }),
      ),
    ).toThrow(/must be delicious/);
  });

  it("passes the parsed value and variable name to custom validators", () => {
    let seen: Array<number | string> = [];
    parseEnvOrThrow(
      {
        value: number("PORT", {
          custom: (value, name) => {
            seen = [value, name];
            return true;
          },
        }),
      },
      src({ PORT: "1234" }),
    );
    expect(seen).toEqual([1234, "PORT"]);
  });

  it("accepts a custom validator returning true or undefined", () => {
    expect(parseValue(string("S", { custom: () => true }), { S: "x" })).toBe("x");
    expect(parseValue(string("S", { custom: () => undefined }), { S: "x" })).toBe("x");
  });

  it("validates defaults against the same rules", () => {
    expect(() =>
      parseEnvOrThrow({ value: number("PORT", { default: 80, min: 1000 }) }, src({})),
    ).toThrow(EnvValidationError);
    expect(parseValue(number("PORT", { default: 8080, min: 1000 }), {})).toBe(8080);
  });

  it("rejects invalid min/max combinations at call time", () => {
    expect(() =>
      parseEnvOrThrow({ value: number("PORT", { min: 100, max: 1 }) }, src({ PORT: "1" })),
    ).toThrow(EnvError);
    expect(() =>
      parseEnvOrThrow({ value: string("S", { minLength: 10, maxLength: 5 }) }, src({ S: "x" })),
    ).toThrow(EnvError);
  });

  it("applies custom validation to enum values", () => {
    const mode = parseValue(
      enumValue("MODE", ["dev", "prod"] as const, {
        default: "dev",
        custom: (value) => value === "dev",
      }),
      { MODE: "dev" },
    );
    expect(mode).toBe("dev");
  });

  it("does not run custom validation when a value is absent", () => {
    expect(parseValue(number("PORT", { optional: true, custom: () => false }), {})).toBeUndefined();
  });

  it("resets a global-flag regex between calls (BUG-001)", () => {
    const re = /hello/g;
    const opts = { pattern: re };
    // Reuse the same regex across repeated parses; all must accept.
    for (let i = 0; i < 3; i++) {
      expect(parseValue(string("RE", opts), { RE: "hello" })).toBe("hello");
    }
  });
});
