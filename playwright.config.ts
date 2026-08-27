import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end runs against a production build on its own port, not the dev
 * server. Service worker behaviour and bundle caching only mean anything
 * against real, content-hashed output — testing them in dev would prove nothing.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3288",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node ./node_modules/next/dist/bin/next build && node ./node_modules/next/dist/bin/next start -p 3288",
    url: "http://localhost:3288",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    /*
     * Deliberately runs against the generated world. Pointing the suite at the
     * live API would spend the monthly request budget on every run and make the
     * assertions depend on whatever the railway is doing today.
     */
    /*
     * Both keys are deliberately unset. Pointing the suite at the live APIs
     * would spend the monthly request budget on every run and make assertions
     * depend on what the railway is doing today.
     */
    env: { ...(process.env as Record<string, string>), RAILRADAR_API_KEY: "", SARVAM_API_KEY: "", ANTHROPIC_API_KEY: "", CHAT_FAKE: "1", NEXT_DIST_DIR: ".next-e2e" },
  },
});
