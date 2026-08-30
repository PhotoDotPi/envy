import { describe, expect, expectTypeOf, it } from "vitest";
import { env } from "../src";
import { withEnv } from "./helpers";

describe("env.config", () => {
  it("builds a typed, immutable configuration object", () => {
    const restore = withEnv({
      PORT: "8080",
      DEBUG: "true",
      DATABASE_URL: "postgres://user@host/db",
      NODE_ENV: "production",
    });
    try {
      const config = env.config({
        port: env.number("PORT", 3000),
        debug: env.boolean("DEBUG", false),
        databaseUrl: env.string("DATABASE_URL"),
        nodeEnv: env.enum("NODE_ENV", ["development", "production", "test"] as const),
      });
      expect(config).toEqual({
        port: 8080,
        debug: true,
        databaseUrl: "postgres://user@host/db",
        nodeEnv: "production",
      });
      expect(Object.isFrozen(config)).toBe(true);

      expectTypeOf(config.port).toEqualTypeOf<number>();
      expectTypeOf(config.debug).toEqualTypeOf<boolean>();
      expectTypeOf(config.databaseUrl).toEqualTypeOf<string>();
      expectTypeOf(config.nodeEnv).toEqualTypeOf<"development" | "production" | "test">();
    } finally {
      restore();
    }
  });

  it("is immutable (BUG-003)", () => {
    const restore = withEnv({ PORT: "8080" });
    const config = env.config({ port: env.number("PORT", 3000) });
    try {
      expect(Object.isFrozen(config)).toBe(true);
      expect(() => {
        (config as { port: number }).port = 999;
      }).toThrow(TypeError);
    } finally {
      restore();
    }
  });

  it("applies defaults", () => {
    const restore = withEnv({ PORT: undefined });
    try {
      const config = env.config({ port: env.number("PORT", 3000) });
      expect(config.port).toBe(3000);
    } finally {
      restore();
    }
  });

  it("throws a variable-identifying error for missing variables", () => {
    const restore = withEnv({ PORT: undefined });
    try {
      expect(() =>
        env.config({
          port: env.number("PORT", 3000),
          databaseUrl: env.string("DATABASE_URL"),
        }),
      ).toThrow(/DATABASE_URL/);
    } finally {
      restore();
    }
  });

  it("fails fast when a variable is invalid", () => {
    const restore = withEnv({ PORT: "not-a-number", DATABASE_URL: "x" });
    try {
      expect(() =>
        env.config({
          port: env.number("PORT", 3000),
          databaseUrl: env.string("DATABASE_URL"),
        }),
      ).toThrow(/PORT/);
    } finally {
      restore();
    }
  });

  it("never mutates process.env while parsing", () => {
    const restore = withEnv({ PORT: "8080" });
    try {
      env.config({ port: env.number("PORT", 3000) });
      expect(process.env.PORT).toBe("8080");
    } finally {
      restore();
    }
  });

  it("infers the exact config shape", () => {
    const restore = withEnv({ NODE_ENV: "development" });
    const config = env.config({
      port: env.number("PORT", 3000),
      nodeEnv: env.enum("NODE_ENV", ["development", "production"] as const),
    });
    expectTypeOf(config).toMatchTypeOf<{
      port: number;
      nodeEnv: "development" | "production";
    }>();
    restore();
  });
});
