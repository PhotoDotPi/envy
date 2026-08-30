import { describe, expect, it } from "vitest";
import { EnvMissingError, parseEnvOrThrow } from "../src";
import { string } from "../src/parsers/string";
import { parseValue } from "./helpers";

function readString(source: Record<string, string | undefined>) {
  return parseEnvOrThrow({ value: string("NAME") }, source);
}

describe("string parser", () => {
  it("returns the value as-is", () => {
    expect(parseValue(string("NAME"), { NAME: "hello world" })).toBe("hello world");
  });

  it("keeps leading and trailing whitespace by default", () => {
    expect(parseValue(string("NAME"), { NAME: "  padded  " })).toBe("  padded  ");
  });

  it("trims when trim: true", () => {
    expect(parseValue(string("NAME", { trim: true }), { NAME: "  padded  " })).toBe("padded");
  });

  it("does not coerce 'undefined' to undefined", () => {
    expect(parseValue(string("NAME"), { NAME: "undefined" })).toBe("undefined");
  });

  it("throws EnvMissingError when a required variable is missing", () => {
    expect(() => readString({ NAME: undefined })).toThrow(EnvMissingError);
    expect(() => readString({ NAME: undefined })).toThrow(/required/);
  });

  it("includes the expected type in the missing error", () => {
    expect(() => readString({})).toThrow(/Expected: a string/);
  });

  it("uses the default when missing", () => {
    expect(parseValue(string("NAME", "fallback"), {})).toBe("fallback");
  });

  it("uses the default via options", () => {
    expect(parseValue(string("NAME", { default: "options default" }), {})).toBe("options default");
  });

  it("ignores the default when the variable is present", () => {
    expect(parseValue(string("NAME", "fallback"), { NAME: "actual" })).toBe("actual");
  });

  it("treats an empty value like a missing one", () => {
    expect(parseValue(string("NAME", "fallback"), { NAME: "" })).toBe("fallback");
    expect(() => readString({ NAME: "" })).toThrow(EnvMissingError);
  });

  it("treats a whitespace-only value like a missing one when trim is enabled", () => {
    expect(parseValue(string("NAME", { default: "again", trim: true }), { NAME: "   " })).toBe(
      "again",
    );
  });

  it("returns undefined when default is explicitly undefined", () => {
    expect(parseValue(string("NAME", undefined), {})).toBeUndefined();
  });

  it("does not mutate the source", () => {
    const source = { NAME: "hi" };
    parseValue(string("NAME"), source);
    expect(source).toEqual({ NAME: "hi" });
  });
});
