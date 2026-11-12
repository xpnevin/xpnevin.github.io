import { defineConfig } from "@playwright/test";

// The optional executable override lets restricted CI environments supply Chromium.
const executablePath = process.env.CHROMIUM_PATH;
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    launchOptions: executablePath
      ? {
          executablePath,
          args: ["--no-sandbox", "--no-zygote", "--disable-dev-shm-usage"],
        }
      : {},
  },
  projects: [
    {
      name: "desktop",
      use: { browserName: "chromium", viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "mobile",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "python3 -m http.server 4173 --bind 0.0.0.0",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    stderr: "ignore",
    timeout: 15000,
  },
});
