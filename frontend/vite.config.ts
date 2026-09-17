/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  css: {
    preprocessorOptions: {
      scss: {
        // Carbon's own Sass source triggers Dart Sass deprecation warnings
        // we can't fix from here. Silencing warnings from dependencies only
        // keeps our build output readable without hiding problems in code
        // we actually own.
        quietDeps: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
    // axe-core accessibility scans of whole pages can take several seconds
    // when every test file runs in parallel; the 5s default made them flaky.
    testTimeout: 20_000,
    // Tests always exercise the mock data source unless a test says otherwise.
    env: { VITE_DATA_SOURCE: "mock" },
  },
});
