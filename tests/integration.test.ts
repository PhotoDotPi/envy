import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EnvError,
  EnvMissingError,
  EnvParseError,
  EnvValidationError,
  env,
  fromProcessEnv,
  parseEnv,
  parseEnvOrThrow,
} from "../src";
import { loadEnv } from "../src/load";
import { withEnv } from "./helpers";

describe("integration", () => {
  it("supports a realistic application configuration", () => {
    const restore = withEnv({
      PORT: "8080",
      NODE_ENV: "production",
      DEBUG: "no",
      DATABASE_URL: "postgres://user:pass@db/prod",
      MAX_UPLOAD_BYTES: "10485760",
      RETRY_COUNT: "5",
    });
    try {
      const config = env.config({
        port: env.number("PORT", 3000),
        nodeEnv: env.enum("NODE_ENV", ["development", "production", "test"] as const),
        debug: env.boolean("DEBUG", false),
        databaseUrl: env.url("DATABASE_URL"),
        maxUploadBytes: env.bigint("MAX_UPLOAD_BYTES"),
        retryCount: env.number("RETRY_COUNT", { min: 1, integer: true }),
        greeting: env.string("GREETING", "hello"),
        featureX: env.optional.boolean("FEATURE_X"),
      });

      expect(config.port).toBe(8080);
      expect(config.nodeEnv).toBe("production");
      expect(config.debug).toBe(false);
      expect(config.databaseUrl.hostname).toBe("db");
      expect(config.maxUploadBytes).toBe(10485760n);
      expect(config.retryCount).toBe(5);
      expect(config.greeting).toBe("hello");
      expect(config.featureX).toBeUndefined();
      expect(Object.isFrozen(config)).toBe(true);
    } finally {
      restore();
    }
  });

  it("reads the environment fresh on every call", () => {
    const restore = withEnv({ N: "1" });
    try {
      expect(parseEnvOrThrow({ n: env.number("N") }, fromProcessEnv()).n).toBe(1);
      process.env.N = "2";
      expect(parseEnvOrThrow({ n: env.number("N") }, fromProcessEnv()).n).toBe(2);
    } finally {
      restore();
    }
  });

  it("parses from a plain object without touching process.env (BUG-004)", () => {
    const result = parseEnv({ PORT: env.number("PORT") }, { PORT: "3000" });
    expect(result).toEqual({ success: true, env: { PORT: 3000 } });
    if (result.success) {
      expect(Object.isFrozen(result.env)).toBe(true);
    }
  });

  it("exposes the full public API", () => {
    expect(typeof env.string).toBe("function");
    expect(typeof env.number).toBe("function");
    expect(typeof env.boolean).toBe("function");
    expect(typeof env.bigint).toBe("function");
    expect(typeof env.url).toBe("function");
    expect(typeof env.enum).toBe("function");
    expect(typeof env.email).toBe("function");
    expect(typeof env.host).toBe("function");
    expect(typeof env.port).toBe("function");
    expect(typeof env.json).toBe("function");
    expect(typeof env.config).toBe("function");
    expect(typeof env.result).toBe("function");
    expect(typeof env.optional.string).toBe("function");
    expect(typeof env.optional.enum).toBe("function");
  });

  it("rejects an empty variable name", () => {
    const result = parseEnv({ x: env.string("") }, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.x?.code).toBe("invalid_options");
    }
  });

  it("loads a .env file and then reads from the merged environment", () => {
    const dir = mkdtempSync(join(tmpdir(), "envy-int-"));
    const file = join(dir, ".env");
    try {
      writeFileSync(file, "INT_PORT=1234\n", "utf8");
      expect(loadEnv({ path: file }).INT_PORT).toBe("1234");
      expect(env.config({ intPort: env.number("INT_PORT") }).intPort).toBe(1234);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      const restore = withEnv({ INT_PORT: undefined });
      restore();
    }
  });

  it("discriminates error classes by instanceof", () => {
    let error: unknown;
    try {
      parseEnvOrThrow({ value: env.number("C") }, fromProcessEnv());
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(EnvMissingError);

    try {
      parseEnvOrThrow({ value: env.number("A") }, { A: "abc" });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(EnvParseError);

    try {
      parseEnvOrThrow({ value: env.number("B", { min: 1 }) }, { B: "0" });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(EnvValidationError);
    expect(error).toBeInstanceOf(EnvError);
  });

  it("aggregates all failures in a result (IMP-007)", () => {
    const result = parseEnv(
      {
        PORT: env.number("PORT", { min: 1 }),
        HOST: env.string("HOST"),
        MODE: env.enum("MODE", ["a", "b"] as const),
      },
      { PORT: "0", HOST: "ok", MODE: "nope" },
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.PORT?.code).toBe("validation");
      expect(result.errors.HOST).toBeUndefined();
      expect(result.errors.MODE?.code).toBe("invalid_enum");
    }
  });

  it("supports the non-throwing result API (IMP-006)", () => {
    const result = parseEnv({ PORT: env.number("PORT") }, { PORT: "abc" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.PORT?.code).toBe("invalid_number");
      expect(result.errors.PORT?.message).toContain("must be a number");
    }
  });
});
