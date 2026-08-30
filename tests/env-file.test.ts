import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EnvError } from "../src";
import { loadEnv } from "../src/load";
import { withEnv } from "./helpers";

const tempDirs: string[] = [];

function writeEnvFile(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), "envy-envfile-"));
  tempDirs.push(dir);
  const filePath = join(dir, ".env");
  writeFileSync(filePath, content, "utf8");
  return filePath;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("loadEnv", () => {
  it("parses simple KEY=VALUE pairs", () => {
    const file = writeEnvFile("PORT=3000\nHOST=localhost\n");
    const parsed = loadEnv({ path: file });
    expect(parsed).toEqual({ PORT: "3000", HOST: "localhost" });
    expect(process.env.PORT).toBe("3000");
    const restore = withEnv({ PORT: undefined, HOST: undefined });
    restore();
  });

  it("accepts a plain string path", () => {
    const file = writeEnvFile("FOO=bar\n");
    expect(loadEnv(file).FOO).toBe("bar");
    const restore = withEnv({ FOO: undefined });
    restore();
  });

  it("ignores comments and blank lines", () => {
    const file = writeEnvFile("# leading comment\n\nFOO=bar # trailing comment\nBAZ=qux\n");
    const parsed = loadEnv({ path: file });
    expect(parsed).toEqual({ FOO: "bar", BAZ: "qux" });
    const restore = withEnv({ FOO: undefined, BAZ: undefined });
    restore();
  });

  it("strips double and single quotes and honors escapes", () => {
    const file = writeEnvFile(
      'A="hello world"\nB=\'single quotes\'\nC="line\\nbreak"\nD="\\"escaped\\""\n',
    );
    const parsed = loadEnv({ path: file });
    expect(parsed).toEqual({
      A: "hello world",
      B: "single quotes",
      C: "line\nbreak",
      D: '"escaped"',
    });
    const restore = withEnv({ A: undefined, B: undefined, C: undefined, D: undefined });
    restore();
  });

  it("supports export-prefixed lines", () => {
    const file = writeEnvFile("export REPO_URL=https://github.com/example/repo.git\n");
    expect(loadEnv({ path: file }).REPO_URL).toBe("https://github.com/example/repo.git");
    const restore = withEnv({ REPO_URL: undefined });
    restore();
  });

  it("skips lines without an equals sign and invalid keys", () => {
    const file = writeEnvFile("no equals here\n1BAD=value\n\nOK=yes\n");
    const parsed = loadEnv({ path: file });
    expect(parsed).toEqual({ OK: "yes" });
    expect(process.env["1BAD"]).toBeUndefined();
    const restore = withEnv({ OK: undefined });
    restore();
  });

  it("does not override existing environment variables by default", () => {
    const file = writeEnvFile("EXISTING=from-file\n");
    const restore = withEnv({ EXISTING: "from-shell" });
    try {
      loadEnv({ path: file });
      expect(process.env.EXISTING).toBe("from-shell");
    } finally {
      restore();
    }
  });

  it("overrides existing variables when requested", () => {
    const file = writeEnvFile("EXISTING=from-file\n");
    const restore = withEnv({ EXISTING: "from-shell" });
    try {
      loadEnv({ path: file, override: true });
      expect(process.env.EXISTING).toBe("from-file");
    } finally {
      restore();
    }
  });

  it("ignores a missing file by default and returns nothing", () => {
    const missing = join(tmpdir(), "envy-does-not-exist-.env");
    const parsed = loadEnv({ path: missing });
    expect(parsed).toEqual({});
  });

  it("throws EnvError when required and the file is missing", () => {
    const missing = join(tmpdir(), "envy-does-not-exist-required.env");
    expect(() => loadEnv({ path: missing, required: true })).toThrow(EnvError);
    expect(() => loadEnv({ path: missing, required: true })).toThrow(/Could not find/);
  });

  it("returns all parsed pairs even when they were not applied", () => {
    const file = writeEnvFile("KEEP=old\n");
    const restore = withEnv({ KEEP: "old" });
    try {
      const parsed = loadEnv({ path: file });
      expect(parsed).toEqual({ KEEP: "old" });
    } finally {
      restore();
    }
  });

  it("handles CRLF line endings and a BOM", () => {
    const file = writeEnvFile("\uFEFFA=1\r\nB=2\r\n");
    const parsed = loadEnv({ path: file });
    expect(parsed).toEqual({ A: "1", B: "2" });
    const restore = withEnv({ A: undefined, B: undefined });
    restore();
  });

  it("later duplicates win within a file", () => {
    const file = writeEnvFile("DUP=first\nDUP=second\n");
    expect(loadEnv({ path: file }).DUP).toBe("second");
    const restore = withEnv({ DUP: undefined });
    restore();
  });

  it("loads required files and returns their pairs", () => {
    const file = writeEnvFile("VIA_LOAD=yes\n");
    const parsed = loadEnv({ path: file, required: true });
    expect(parsed.VIA_LOAD).toBe("yes");
    const restore = withEnv({ VIA_LOAD: undefined });
    restore();
  });

  it("uses the invalid_options envelope for required-file I/O failures", () => {
    const missing = join(tmpdir(), `envy-io-envelope-${Date.now()}.env`);
    try {
      loadEnv({ path: missing, required: true });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(EnvError);
      expect((error as EnvError).code).toBe("invalid_options");
    }
  });

  it("reports an unreadable file", () => {
    // Pointing at a directory produces a non-ENOENT read failure.
    expect(() => loadEnv({ path: tmpdir(), required: true })).toThrow(EnvError);
  });

  it("does not expand ${VAR} interpolation (documented-unsupported, P2-03)", () => {
    const file = writeEnvFile("PATH_LIKE=${HOME}/bin\nRAW=$${NOT_LITERAL}\n");
    const parsed = loadEnv({ path: file });
    expect(parsed.PATH_LIKE).toBe("${HOME}/bin");
    expect(parsed.RAW).toBe("$${NOT_LITERAL}");
    const restore = withEnv({ PATH_LIKE: undefined, RAW: undefined });
    restore();
  });

  it("does not support multiline quoted values (documented-unsupported, P2-03)", () => {
    // The loader is line-oriented: an unterminated opening quote renders an
    // empty value, and the next line is treated as a fresh entry.
    const file = writeEnvFile('MULTI="first line\nsecond line"\n');
    const parsed = loadEnv({ path: file });
    expect(parsed.MULTI).toBe("");
    expect(parsed['second line"']).toBeUndefined();
    const restore = withEnv({ MULTI: undefined });
    restore();
  });
});
