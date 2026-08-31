/**
 * Runs the positive and negative type tests.
 *
 * - valid.ts must compile (exit 0). A regression in type inference makes it fail.
 * - invalid.ts must compile (exit 0) such that every `@ts-expect-error` is
 *   "used". If the library fails to reject an unsound usage, an unused
 *   `@ts-expect-error` makes tsc fail.
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Resolve the locally installed TypeScript compiler and run it with the Node
// runtime — no npx/shell indirection needed.
const require2 = createRequire(import.meta.url);
const tscJs = require2.resolve("typescript/bin/tsc");

function run(name, project) {
  try {
    execFileSync(process.execPath, [tscJs, "-p", project, "--noEmit"], { stdio: "inherit" });
    console.log(`PASS: ${name} type test compiled as expected.`);
    return true;
  } catch {
    console.error(`FAIL: ${name} type test did not behave as expected.`);
    return false;
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const ok =
  run("valid", join(root, "type-tests/tsconfig.valid.json")) &&
  run("invalid", join(root, "type-tests/tsconfig.invalid.json"));

if (!ok) {
  console.error("Type tests failed.");
  process.exit(1);
}
console.log("All type tests passed.");
