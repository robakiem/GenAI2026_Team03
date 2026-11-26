import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/test/**", "src/data/generated/**", "src/index.ts"],
      reporter: ["text-summary", "text"],
      // The build fails when coverage drops below these floors (set just under the current level).
      thresholds: { statements: 95, branches: 85, functions: 95, lines: 95 },
    },
  },
});
