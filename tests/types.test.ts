import { beforeEach, describe, expectTypeOf, it } from "vitest";
import { env } from "../src";
import { typeProbe, withEnv } from "./helpers";

// `env.config` reads process.env; set the vars it needs so the type assertion
// can evaluate without throwing.
beforeEach(() =>
  withEnv({
    T_PORT: "3000",
    T_DEBUG: "true",
    T_DATABASE_URL: "postgres://u@h/db",
    T_NODE_ENV: "development",
    T_UPLOAD_LIMIT: "1000",
    T_BASE_URL: "https://example.com",
    T_LOG_LEVEL: "info",
  }),
);

// `typeProbe` returns a field's output type WITHOUT parsing anything, so these
// assertions are purely compile-time and never touch the environment.
describe("compile-time type inference", () => {
  it("infers parsers with no default and no options", () => {
    expectTypeOf(typeProbe(env.string("T_NAME"))).toEqualTypeOf<string>();
    expectTypeOf(typeProbe(env.number("T_PORT"))).toEqualTypeOf<number>();
    expectTypeOf(typeProbe(env.boolean("T_DEBUG"))).toEqualTypeOf<boolean>();
    expectTypeOf(typeProbe(env.bigint("T_MAX"))).toEqualTypeOf<bigint>();
    expectTypeOf(typeProbe(env.url("T_API_URL"))).toEqualTypeOf<URL>();
  });

  it("infers parsers with a bare default", () => {
    expectTypeOf(typeProbe(env.string("T_NAME", "default"))).toEqualTypeOf<string>();
    expectTypeOf(typeProbe(env.number("T_PORT", 3000))).toEqualTypeOf<number>();
    expectTypeOf(typeProbe(env.boolean("T_DEBUG", false))).toEqualTypeOf<boolean>();
    expectTypeOf(typeProbe(env.bigint("T_MAX", 1000n))).toEqualTypeOf<bigint>();
    expectTypeOf(typeProbe(env.url("T_API_URL", "https://example.com"))).toEqualTypeOf<URL>();
  });

  it("infers parsers with a default inside options", () => {
    expectTypeOf(typeProbe(env.string("T_NAME", { default: "x" }))).toEqualTypeOf<string>();
    expectTypeOf(
      typeProbe(env.number("T_PORT", { default: 3000, min: 1, max: 65535 })),
    ).toEqualTypeOf<number>();
    expectTypeOf(typeProbe(env.boolean("T_DEBUG", { default: true }))).toEqualTypeOf<boolean>();
    expectTypeOf(typeProbe(env.bigint("T_MAX", { default: 10n }))).toEqualTypeOf<bigint>();
    expectTypeOf(
      typeProbe(env.url("T_API_URL", { default: "https://example.com" })),
    ).toEqualTypeOf<URL>();
  });

  it("infers options without a default as required", () => {
    expectTypeOf(typeProbe(env.string("T_NAME", { minLength: 2 }))).toEqualTypeOf<string>();
    expectTypeOf(typeProbe(env.number("T_PORT", { min: 1 }))).toEqualTypeOf<number>();
    expectTypeOf(typeProbe(env.boolean("T_DEBUG", {}))).toEqualTypeOf<boolean>();
  });

  it("infers explicit undefined as optional", () => {
    expectTypeOf(typeProbe(env.string("T_NAME", undefined))).toEqualTypeOf<string | undefined>();
    expectTypeOf(typeProbe(env.number("T_PORT", undefined))).toEqualTypeOf<number | undefined>();
    expectTypeOf(typeProbe(env.boolean("T_DEBUG", undefined))).toEqualTypeOf<boolean | undefined>();
    expectTypeOf(typeProbe(env.bigint("T_MAX", undefined))).toEqualTypeOf<bigint | undefined>();
    expectTypeOf(typeProbe(env.url("T_API_URL", undefined))).toEqualTypeOf<URL | undefined>();
  });

  it("infers optional: true as optional", () => {
    expectTypeOf(typeProbe(env.string("T_NAME", { optional: true }))).toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf(typeProbe(env.number("T_PORT", { optional: true }))).toEqualTypeOf<
      number | undefined
    >();
  });

  it("infers the optional namespace", () => {
    expectTypeOf(typeProbe(env.optional.string("T_NAME"))).toEqualTypeOf<string | undefined>();
    expectTypeOf(typeProbe(env.optional.number("T_PORT"))).toEqualTypeOf<number | undefined>();
    expectTypeOf(typeProbe(env.optional.boolean("T_DEBUG"))).toEqualTypeOf<boolean | undefined>();
    expectTypeOf(typeProbe(env.optional.bigint("T_MAX"))).toEqualTypeOf<bigint | undefined>();
    expectTypeOf(typeProbe(env.optional.url("T_API_URL"))).toEqualTypeOf<URL | undefined>();
  });

  it("infers enum literal unions and never widens to string", () => {
    expectTypeOf(
      typeProbe(env.enum("T_NODE_ENV", ["development", "production", "test"] as const)),
    ).toEqualTypeOf<"development" | "production" | "test">();
    expectTypeOf(typeProbe(env.enum("T_MODE", ["dev", "prod"] as const, "dev"))).toEqualTypeOf<
      "dev" | "prod"
    >();
    expectTypeOf(
      typeProbe(env.optional.enum("T_OPT_ENV", ["develop", "prod", "test"] as const)),
    ).toEqualTypeOf<"develop" | "prod" | "test" | undefined>();
    expectTypeOf(
      typeProbe(env.enum("T_AB1", ["a", "b"] as const, { optional: true })),
    ).toEqualTypeOf<"a" | "b" | undefined>();
    expectTypeOf(typeProbe(env.enum("T_AB2", ["a", "b"] as const, { default: "a" }))).toEqualTypeOf<
      "a" | "b"
    >();
  });

  it("infers a plain string array enum as string", () => {
    const modes = ["dev", "prod"];
    expectTypeOf(typeProbe(env.enum("T_MODE", modes))).toEqualTypeOf<string>();
  });

  it("infers new validators", () => {
    expectTypeOf(typeProbe(env.email("E"))).toEqualTypeOf<string>();
    expectTypeOf(typeProbe(env.host("H"))).toEqualTypeOf<string>();
    expectTypeOf(typeProbe(env.port("P"))).toEqualTypeOf<number>();
    expectTypeOf(typeProbe(env.json("J"))).toEqualTypeOf<unknown>();
  });

  it("infers config shapes and readonly output", () => {
    const config = env.config({
      port: env.number("T_PORT", 3000),
      debug: env.boolean("T_DEBUG", false),
      databaseUrl: env.string("T_DATABASE_URL"),
      nodeEnv: env.enum("T_NODE_ENV", ["development", "production", "test"] as const),
      uploadLimit: env.bigint("T_UPLOAD_LIMIT", 1000n),
      baseUrl: env.url("T_BASE_URL", "https://example.com"),
      logLevel: env.optional.string("T_LOG_LEVEL"),
    });
    expectTypeOf(config).toMatchTypeOf<{
      port: number;
      debug: boolean;
      databaseUrl: string;
      nodeEnv: "development" | "production" | "test";
      uploadLimit: bigint;
      baseUrl: URL;
      logLevel: string | undefined;
    }>();
  });
});
