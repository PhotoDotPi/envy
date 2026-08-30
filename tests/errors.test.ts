import { describe, expect, it } from "vitest";
import {
  EnvError,
  EnvMissingError,
  EnvParseError,
  EnvValidationError,
  parseEnv,
  parseEnvOrThrow,
} from "../src";
import { number } from "../src/parsers/number";
import { string } from "../src/parsers/string";
import { src } from "./helpers";

function runThrow(field: ReturnType<typeof string>) {
  return parseEnvOrThrow({ value: field }, src({ A: undefined }));
}

describe("error classes", () => {
  it("EnvError is an Error subclass", () => {
    let caught: unknown;
    try {
      runThrow(string("A"));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught).toBeInstanceOf(EnvError);
    expect((caught as EnvError).code).toBe("missing");
  });

  it("exposes a useful name on every error subclass", () => {
    let error: EnvError | undefined;
    try {
      parseEnvOrThrow({ value: number("C") }, src({}));
    } catch (caught) {
      error = caught as EnvError;
    }
    expect(error).toBeInstanceOf(EnvMissingError);
    expect(error?.name).toBe("EnvMissingError");

    try {
      parseEnvOrThrow({ value: number("A") }, src({ A: "x" }));
    } catch (caught) {
      error = caught as EnvError;
    }
    expect(error).toBeInstanceOf(EnvParseError);
    expect(error?.name).toBe("EnvParseError");

    try {
      parseEnvOrThrow({ value: number("B", { min: 100 }) }, src({ B: "50" }));
    } catch (caught) {
      error = caught as EnvError;
    }
    expect(error).toBeInstanceOf(EnvValidationError);
    expect(error?.name).toBe("EnvValidationError");
  });

  it("is easy to catch programmatically", () => {
    try {
      parseEnvOrThrow({ value: string("A") }, src({}));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(EnvMissingError);
      const err = error as EnvMissingError;
      expect(err.variable).toBe("A");
      expect(err.expected).toBe("a string");
      expect(err.code).toBe("missing");
    }
  });

  it("reports the variable name and expected type", () => {
    try {
      parseEnvOrThrow({ value: number("PORT") }, src({ PORT: "abc" }));
      expect.unreachable();
    } catch (error) {
      const err = error as EnvParseError;
      expect(err.variable).toBe("PORT");
      expect(err.expected).toBe("a number");
      expect(err.code).toBe("invalid_number");
      expect(err.message).toContain("PORT");
      expect(err.message).toContain("must be a number");
    }
  });

  it("validation errors carry a reason and code", () => {
    try {
      parseEnvOrThrow({ value: number("PORT", { min: 1 }) }, src({ PORT: "0" }));
      expect.unreachable();
    } catch (error) {
      const err = error as EnvValidationError;
      expect(err.reason).toBe("must be at least 1");
      expect(err.code).toBe("validation");
      expect(err.message).toContain("failed validation");
    }
  });

  it("does not leak values of secret-like variable names", () => {
    try {
      parseEnvOrThrow(
        { value: number("DATABASE_PASSWORD") },
        src({ DATABASE_PASSWORD: "supersecret" }),
      );
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(EnvParseError);
      expect((error as EnvParseError).message).not.toContain("supersecret");
    }
    try {
      parseEnvOrThrow({ value: number("API_KEY") }, src({ API_KEY: "key-123" }));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(EnvParseError);
      expect((error as EnvParseError).message).not.toContain("key-123");
    }
    try {
      parseEnvOrThrow({ value: number("PORT") }, src({ PORT: "abc" }));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(EnvParseError);
      expect((error as EnvParseError).message).toContain('"abc"');
    }
  });

  it("omits the received segment entirely for secret names (BUG-002)", () => {
    const result = parseEnv({ value: number("API_KEY") }, src({ API_KEY: "abc-not-a-number" }));
    if (result.success) throw new Error("expected failure");
    expect(result.errors.value).toBeDefined();
    expect(result.errors.value?.received).toBeUndefined();
    expect(result.errors.value?.message).not.toContain("undefined");
    expect(result.errors.value?.message).not.toContain("abc-not-a-number");
  });

  it("does not consider MONKEY or KEYBOARD to be secret names", () => {
    expect(parseEnvOrThrow({ value: string("MONKEY") }, src({ MONKEY: "banana" })).value).toBe(
      "banana",
    );
    try {
      parseEnvOrThrow({ value: number("MONKEY") }, src({ MONKEY: "banana" }));
      expect.unreachable();
    } catch (error) {
      expect((error as EnvParseError).message).toContain("banana");
    }
  });
});
