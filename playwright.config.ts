import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const PORT = 3210;

/**
 * Some sandboxes ship a Chromium that does not match the build this Playwright
 * wants, and cannot download another. Point at what is actually there instead
 * of failing. Returns undefined on a normal CI runner, where
 * `playwright install` has put the matching build in place.
 */
function preinstalledChromium(): string | undefined {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!base || !existsSync(base)) return undefined;

  const build = readdirSync(base).find((entry) => /^chromium-\d+$/.test(entry));
  if (!build) return undefined;

  const binary = join(base, build, 'chrome-linux', 'chrome');
  return existsSync(binary) ? binary : undefined;
}

const executablePath = preinstalledChromium();

export default defineConfig({
  testDir: './apps/inv/test',
  timeout: 90_000,
  // The hog runs a forty-child scrubbed timeline. Parallel workers on one CPU
  // would starve each other's rAF and produce failures that are about the
  // runner, not the orchestrator.
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // The performance target is a mid-range Android, not a laptop, so the
    // harness runs at that viewport with touch and a real device scale factor.
    ...devices['Pixel 5'],
    launchOptions: {
      // Chromium refuses to launch as root without this. CI runners are
      // non-root and would not need it; harmless there, required in a
      // container.
      args: ['--no-sandbox'],
      ...(executablePath ? { executablePath } : {}),
    },
  },
  webServer: {
    command: `pnpm --filter @kairn/inv start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/harness`,
    // Never reuse. A server left running from an earlier build serves a stale
    // chunk manifest after a rebuild — every chunk 500s, hydration dies, and
    // the failure presents as "the gate never enables", which sends you looking
    // in entirely the wrong place.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
