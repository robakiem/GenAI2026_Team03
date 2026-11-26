import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/test/**", "src/index.ts"],
      reporter: ["text-summary", "text"],
      // The build fails when coverage drops below these floors (set just under the current level).
      thresholds: { statements: 97, branches: 90, functions: 100, lines: 97 },
    },
  },
});
