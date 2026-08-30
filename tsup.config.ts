import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    load: "src/load.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  outDir: "dist",
  splitting: true,
});
