import { describe, expect, it } from "vitest";
import { EnvMissingError, EnvParseError, parseEnvOrThrow } from "../src";
import { url } from "../src/parsers/url";
import { parseValue, src } from "./helpers";

describe("url parser", () => {
  it("parses a valid absolute URL", () => {
    const parsed = parseValue(url("API_URL"), {
      API_URL: "https://api.example.com/v1?key=value#frag",
    });
    expect(parsed).toBeInstanceOf(URL);
    expect(parsed.hostname).toBe("api.example.com");
    expect(parsed.pathname).toBe("/v1");
    expect(parsed.searchParams.get("key")).toBe("value");
  });

  it("trims surrounding whitespace", () => {
    expect(parseValue(url("API_URL"), { API_URL: "  https://example.com  " }).href).toBe(
      "https://example.com/",
    );
  });

  it.each(["not a url", "example.com", "/just/a/path"])("rejects %s", (raw) => {
    expect(() => parseEnvOrThrow({ value: url("API_URL") }, src({ API_URL: raw }))).toThrow(
      EnvParseError,
    );
    expect(() => parseEnvOrThrow({ value: url("API_URL") }, src({ API_URL: raw }))).toThrow(
      /valid URL/,
    );
  });

  it("treats an empty value as missing", () => {
    expect(() => parseEnvOrThrow({ value: url("API_URL") }, src({ API_URL: "" }))).toThrow(
      EnvMissingError,
    );
  });

  it("throws EnvMissingError when required and missing", () => {
    expect(() => parseEnvOrThrow({ value: url("API_URL") }, src({}))).toThrow(EnvMissingError);
    expect(() => parseEnvOrThrow({ value: url("API_URL") }, src({}))).toThrow(
      /Expected: a valid URL/,
    );
  });

  it("uses a string default when missing", () => {
    expect(parseValue(url("API_URL", "https://fallback.example.com"), {}).hostname).toBe(
      "fallback.example.com",
    );
    expect(
      parseValue(url("API_URL", { default: "https://options.example.com" }), {}).hostname,
    ).toBe("options.example.com");
  });

  it("uses a URL default when missing", () => {
    const fallback = new URL("https://fallback.example.com");
    expect(parseValue(url("API_URL", fallback), {})).toBe(fallback);
  });

  it("rejects an invalid string default", () => {
    expect(() => parseEnvOrThrow({ value: url("API_URL", "not a url") }, src({}))).toThrow(
      EnvParseError,
    );
  });

  it("returns undefined when optional and missing", () => {
    expect(parseValue(url("API_URL", undefined), {})).toBeUndefined();
  });
});
