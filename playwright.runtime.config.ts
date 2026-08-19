import { defineConfig } from "@playwright/test";

const runtime = process.env.RUNTIME_TARGET;

if (runtime !== "cloudflare" && runtime !== "node") {
  throw new Error("RUNTIME_TARGET must be cloudflare or node");
}

const port = runtime === "cloudflare" ? 3101 : 3102;

export default defineConfig({
  testDir: "./tests/runtime",
  outputDir: `test-results/runtime-${runtime}`,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
  },
  webServer: {
    command:
      runtime === "cloudflare"
        ? `bun run dev -- --host 127.0.0.1 --port ${port} --strictPort`
        : `cross-env PORT=${port} bun run start`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
