import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Type-only modules have no runtime statements worth measuring; excluding
      // them makes the gate measure real code without lowering thresholds.
      exclude: [
        "src/core/types.ts",
        "src/core/field.ts",
        "**/node_modules/**",
        "**/dist/**",
        "**/*.d.ts",
      ],
      reporter: ["text", "json-summary", "html"],
      thresholds: {
        lines: 95,
        functions: 95,
        statements: 95,
        branches: 90,
      },
    },
  },
});
