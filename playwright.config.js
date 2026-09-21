import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  outputDir: ".playwright/results",
  use: {
    baseURL: process.env.TEST_URL || "http://127.0.0.1:5173",
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    launchOptions: process.env.CHROMIUM_PATH
      ? {
          executablePath: process.env.CHROMIUM_PATH,
          args: ["--no-sandbox", "--disable-dev-shm-usage", "--no-zygote"],
        }
      : {},
  },
});
