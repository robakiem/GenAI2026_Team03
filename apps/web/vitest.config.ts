import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/main.tsx", "src/screens.ts"],
      reporter: ["text-summary", "text"],
      // The build fails when coverage drops below these floors (set just under the current level).
      thresholds: { statements: 95, branches: 85, functions: 90, lines: 95 },
    },
  },
});
