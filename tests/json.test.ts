import { describe, expect, it } from "vitest";
import { EnvMissingError, EnvParseError, parseEnvOrThrow } from "../src";
import { json } from "../src/parsers/json";
import { parseValue } from "./helpers";

describe("json parser", () => {
  it("parses a JSON object", () => {
    expect(parseValue(json("J"), { J: '{"a":1,"b":[true,null]}' })).toEqual({
      a: 1,
      b: [true, null],
    });
  });

  it("parses JSON scalars", () => {
    expect(parseValue(json("J"), { J: "42" })).toBe(42);
    expect(parseValue(json("J"), { J: '"hello"' })).toBe("hello");
    expect(parseValue(json("J"), { J: "true" })).toBe(true);
    expect(parseValue(json("J"), { J: "null" })).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(parseValue(json("J"), { J: '  {"a":1}  ' })).toEqual({ a: 1 });
  });

  it.each(["not json", "{bad", "[1,2", "undefined"])("rejects %s", (raw) => {
    expect(() => parseEnvOrThrow({ value: json("J") }, { J: raw })).toThrow(EnvParseError);
    expect(() => parseEnvOrThrow({ value: json("J") }, { J: raw })).toThrow(/valid JSON/);
  });

  it("treats an empty string as missing", () => {
    expect(() => parseEnvOrThrow({ value: json("J") }, { J: "" })).toThrow(EnvMissingError);
  });

  it("returns undefined when optional and missing", () => {
    expect(parseValue(json("J", { optional: true }), {})).toBeUndefined();
  });

  it("applies a custom validator to the parsed value", () => {
    expect(
      parseValue(
        json("J", { custom: (v) => (typeof v === "number" ? true : "must be a number") }),
        {
          J: "42",
        },
      ),
    ).toBe(42);
    expect(() =>
      parseEnvOrThrow(
        {
          value: json("J", { custom: (v) => (typeof v === "number" ? true : "must be a number") }),
        },
        { J: '"str"' },
      ),
    ).toThrow(/must be a number/);
  });
});
