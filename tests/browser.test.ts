import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { afterAll, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Import the parser-only source directly so the regression guards the core
// (BUG-005): a browser build of a pure consumer must not pull in fs/path.
// Named imports are used so the bundle proves the tree-shaken core has zero
// Node references — `import { env }` additionally retains `env.config` /
// `env.result`, which reference `process` only inside function bodies
// (load-safe, documented as Node-only when called).
const sourceEntry = join(root, "src", "index.ts").replace(/\\/g, "/");

const tempDirs: string[] = [];

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

describe("browser bundling (BUG-005)", () => {
  it("esbuild --platform=browser builds a parser-only consumer without fs/path", async () => {
    const dir = mkdtempSync(join(tmpdir(), "envy-browser-"));
    tempDirs.push(dir);
    const entry = join(dir, "entry.ts");

    writeFileSync(
      entry,
      [
        `import { parseEnv, parseEnvOrThrow, number, enumValue, string, fromObject } from ${JSON.stringify(sourceEntry)};`,
        "",
        "const result = parseEnv(",
        "  { port: number('PORT', { default: 1, min: 1 }), mode: enumValue('MODE', ['dev', 'prod']) },",
        "  fromObject({ PORT: '3000', MODE: 'prod' }),",
        ");",
        "const parsed = result.success ? result.env.port : -1;",
        "",
        "const thrown = parseEnvOrThrow(",
        "  { greeting: string('GREETING', 'hi') },",
        "  fromObject({}),",
        ");",
        "",
        "globalThis.__envyResult = { parsed, greeting: thrown.greeting };",
        "export default globalThis.__envyResult;",
      ].join("\n"),
      "utf8",
    );

    const result = await build({
      entryPoints: [entry],
      bundle: true,
      platform: "browser",
      format: "esm",
      // Minify so JSDoc comment text cannot trip the Node-identifier guards.
      minify: true,
      write: false,
      absWorkingDir: root,
      external: [],
    });

    const bundle = result.outputFiles.map((o) => o.text).join("\n");
    // A browser bundle must never reference Node's fs/path in any form.
    expect(bundle).not.toMatch(/\b(require\(|from\s+["'])(fs|path)["']/);
    expect(bundle).not.toMatch(/\b(node:)?(fs|path)\b/);
    expect(bundle).not.toContain("readFileSync");
    expect(bundle).not.toContain('"fs"');
    expect(bundle).not.toContain('"path"');
    // No top-level `process` reference: parsers/adapters must be tree-shaken
    // out of a core-only consumer so the bundle runs in workers/browsers.
    expect(bundle).not.toMatch(/\bprocess\b/);
  });
});
