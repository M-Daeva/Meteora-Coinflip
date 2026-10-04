import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    maxConcurrency: 10,
    testTimeout: 10_000,
    slowTestThreshold: 500,
    // maxWorkers: 100,
    // vmMemoryLimit: "8G",
  },
});
