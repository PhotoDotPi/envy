/**
 * Adapter tests (P1-03). The adapters are the only sanctioned way to bridge a
 * runtime's ambient environment (`process`, `Bun.env`, `Deno.env`,
 * `import.meta.env`) into the pure parsing core. They are explicit opt-ins —
 * the core never performs runtime detection.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fromBunEnv,
  fromDenoEnv,
  fromImportMetaEnv,
  fromObject,
  fromProcessEnv,
  number,
  parseEnvOrThrow,
  string,
} from "../src";
import { parseValue } from "./helpers";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fromObject", () => {
  it("returns the object as-is (live reference)", () => {
    const source = { A: "1" };
    expect(fromObject(source)).toBe(source);
    expect(parseValue(number("A"), fromObject(source))).toBe(1);
    source.A = "2";
    expect(parseValue(number("A"), fromObject(source))).toBe(2);
  });

  it("accepts frozen and null-prototype objects", () => {
    expect(parseValue(number("N"), fromObject(Object.freeze({ N: "5" })))).toBe(5);
    const nullProto = Object.assign(Object.create(null), { N: "6" });
    expect(parseValue(number("N"), fromObject(nullProto))).toBe(6);
  });

  it("is never mutated by parsing", () => {
    const source = { A: "1", B: "2" };
    const snapshot = { ...source };
    parseEnvOrThrow({ a: number("A"), b: number("B") }, fromObject(source));
    expect(source).toEqual(snapshot);
  });
});

describe("fromProcessEnv", () => {
  it("returns the ambient process.env", () => {
    process.env.ENVY_ADAPTER = "abc";
    try {
      expect(fromProcessEnv().ENVY_ADAPTER).toBe("abc");
      expect(parseValue(string("ENVY_ADAPTER"), fromProcessEnv())).toBe("abc");
    } finally {
      delete process.env.ENVY_ADAPTER;
    }
  });
});

describe("fromBunEnv", () => {
  it("prefers Bun.env when present", () => {
    vi.stubGlobal("Bun", { env: { BUN_VAR: "bun" } });
    expect(fromBunEnv().BUN_VAR).toBe("bun");
  });

  it("falls back to process.env when Bun.env is unavailable", () => {
    vi.stubGlobal("Bun", {});
    process.env.ENVY_BUN_FALLBACK = "node";
    try {
      expect(fromBunEnv().ENVY_BUN_FALLBACK).toBe("node");
    } finally {
      delete process.env.ENVY_BUN_FALLBACK;
    }
  });

  it("returns an empty object when neither Bun nor process is available", () => {
    const originalProcess = (globalThis as { process?: unknown }).process;
    try {
      (globalThis as { process?: unknown }).process = undefined;
      expect(fromBunEnv()).toEqual({});
    } finally {
      (globalThis as { process?: unknown }).process = originalProcess;
    }
  });

  it("returns an empty object with no Bun and no process.env readable", () => {
    const originalEnv = process.env;
    try {
      (process as { env?: unknown }).env = undefined;
      expect(fromBunEnv()).toEqual({});
    } finally {
      (process as { env?: unknown }).env = originalEnv;
    }
  });
});

describe("fromDenoEnv", () => {
  it("prefers Deno.env.toObject() when present", () => {
    vi.stubGlobal("Deno", {
      env: { get: () => undefined, toObject: () => ({ DENO_VAR: "deno" }) },
    });
    expect(fromDenoEnv().DENO_VAR).toBe("deno");
  });

  it("falls back to process.env when Deno.env has no toObject", () => {
    vi.stubGlobal("Deno", { env: { get: () => undefined } });
    process.env.ENVY_DENO_FALLBACK = "node";
    try {
      expect(fromDenoEnv().ENVY_DENO_FALLBACK).toBe("node");
    } finally {
      delete process.env.ENVY_DENO_FALLBACK;
    }
  });

  it("falls back to process.env when Deno is absent", () => {
    vi.stubGlobal("Deno", undefined);
    process.env.ENVY_DENO_ABSENT = "node";
    try {
      expect(fromDenoEnv().ENVY_DENO_ABSENT).toBe("node");
    } finally {
      delete process.env.ENVY_DENO_ABSENT;
    }
  });

  it("returns an empty object when neither Deno nor process is available", () => {
    vi.stubGlobal("Deno", undefined);
    const originalProcess = (globalThis as { process?: unknown }).process;
    try {
      (globalThis as { process?: unknown }).process = undefined;
      expect(fromDenoEnv()).toEqual({});
    } finally {
      (globalThis as { process?: unknown }).process = originalProcess;
    }
  });
});

describe("fromImportMetaEnv", () => {
  it("keeps only string-valued entries", () => {
    const meta = {
      VITE_TITLE: "hello",
      VITE_API: undefined,
      DEV: true,
      PROD: false,
      MODE: "production",
      count: 42,
    } as Record<string, unknown>;
    const result = fromImportMetaEnv(meta);
    expect(result).toEqual({ VITE_TITLE: "hello", MODE: "production" });
  });

  it("produces a source that parses correctly", () => {
    const meta = { VITE_PORT: "8080", VITE_LABEL: "x" } as Record<string, unknown>;
    expect(parseValue(string("VITE_LABEL"), fromImportMetaEnv(meta))).toBe("x");
    expect(parseValue(number("VITE_PORT"), fromImportMetaEnv(meta))).toBe(8080);
  });

  it("filters out non-string metadata without crashing", () => {
    const meta = { DEV: true, NODE_ENV: "test", flag: null } as Record<string, unknown>;
    expect(fromImportMetaEnv(meta)).toEqual({ NODE_ENV: "test" });
  });
});
