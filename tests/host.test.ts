import { describe, expect, it } from "vitest";
import { EnvMissingError, EnvParseError, parseEnvOrThrow } from "../src";
import { host } from "../src/parsers/host";
import { parseValue } from "./helpers";

describe("host parser", () => {
  it.each([
    "example.com",
    "localhost",
    "api.example.co.uk",
    "127.0.0.1",
    "255.255.255.255",
    "[::1]",
    "[2001:db8::1]",
    "my-host-01",
  ])("accepts %s", (raw) => {
    expect(parseValue(host("H"), { H: raw })).toBe(raw);
  });

  it("trims surrounding whitespace", () => {
    expect(parseValue(host("H"), { H: "  example.com  " })).toBe("example.com");
  });

  it.each(["not a host", "-bad.com", "bad-.com", "::1", "exa mple", "a..b"])(
    "rejects %s",
    (raw) => {
      expect(() => parseEnvOrThrow({ value: host("H") }, { H: raw })).toThrow(EnvParseError);
      expect(() => parseEnvOrThrow({ value: host("H") }, { H: raw })).toThrow(/valid host/);
    },
  );

  it("requires a TLD when tld: true", () => {
    expect(() => parseEnvOrThrow({ value: host("H", { tld: true }) }, { H: "localhost" })).toThrow(
      EnvParseError,
    );
    expect(parseValue(host("H", { tld: true }), { H: "example.com" })).toBe("example.com");
    expect(() => parseEnvOrThrow({ value: host("H", { tld: true }) }, { H: "127.0.0.1" })).toThrow(
      EnvParseError,
    );
  });

  it("keeps the bracketed-IPv6 heuristic deliberately lax (P2-01)", () => {
    // The heuristic only verifies `[...]` + hex/colon characters; it is not a
    // full IPv6 validator. Locked as a v1 semantic.
    expect(parseValue(host("H"), { H: "[::::]" })).toBe("[::::]");
    expect(parseValue(host("H"), { H: "[abc:def]" })).toBe("[abc:def]");
    // Non-hex characters inside brackets are still rejected.
    expect(() => parseEnvOrThrow({ value: host("H") }, { H: "[not-ipv6]" })).toThrow(EnvParseError);
  });

  it("accepts numeric-looking hostnames as valid DNS labels (P2-01)", () => {
    // `256.1.1.1` is not a valid IPv4 octet but is a perfectly valid DNS
    // hostname label; the parser accepts it as a hostname, never as an IP.
    expect(parseValue(host("H"), { H: "256.1.1.1" })).toBe("256.1.1.1");
  });

  it("treats an empty value as missing", () => {
    expect(() => parseEnvOrThrow({ value: host("H") }, { H: "" })).toThrow(EnvMissingError);
  });

  it("uses the default when missing", () => {
    expect(parseValue(host("H", "localhost"), {})).toBe("localhost");
  });

  it("returns undefined when optional and missing", () => {
    expect(parseValue(host("H", undefined), {})).toBeUndefined();
  });
});
