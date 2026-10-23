/**
 * Desktop launcher of the scripted demo (`public/demo-player.js`): plays it in a phone-sized
 * browser window, to be screen-recorded, and can also save a draft video. The iOS Simulator
 * launcher is `scripts/demo-ios.sh`.
 *
 *   make demo-server         # production build with the demo player enabled
 *   make demo                # start a screen recording of the browser window first
 *   make demo RECORD=1       # also saves a draft video to demo-video/ (Playwright's recorder)
 *
 * Environment: DEMO_URL (default http://localhost:3000), DEMO_BROWSER (chromium | webkit),
 * DEMO_SPEED (pause multiplier, default 1), DEMO_RECORD and DEMO_HEADLESS.
 */
import { chromium, devices, webkit } from "@playwright/test";

const BASE_URL = process.env.DEMO_URL ?? "http://localhost:3000";
const SPEED = Number(process.env.DEMO_SPEED) || 1;
const RECORD_DIR = process.env.DEMO_RECORD ? "demo-video" : null;
const DEVICE = devices["iPhone 15"];

declare global {
  interface Window {
    __demoPlayer?: { started: boolean; done: boolean; error: string | null };
  }
}

const browserType = process.env.DEMO_BROWSER === "webkit" ? webkit : chromium;
const browser = await browserType.launch({ headless: Boolean(process.env.DEMO_HEADLESS) });
const context = await browser.newContext({
  ...DEVICE,
  // Playwright records at the viewport size (no upscaling); the draft is for reviewing the timing.
  ...(RECORD_DIR ? { recordVideo: { dir: RECORD_DIR, size: DEVICE.viewport } } : {}),
});
const page = await context.newPage();

await page.goto(`${BASE_URL}/login#demo&speed=${SPEED}`);
const loaded = await page
  .waitForFunction(() => window.__demoPlayer?.started, null, { timeout: 15_000 })
  .then(() => true)
  .catch(() => false);
if (!loaded) {
  await browser.close();
  throw new Error("The demo player was not loaded: start the server with `make demo-server`.");
}

await page.waitForFunction(() => window.__demoPlayer?.done, null, { timeout: 0, polling: 500 });
const error = await page.evaluate(() => window.__demoPlayer?.error ?? null);

const video = page.video();
await context.close();
await browser.close();
if (video) console.log(`Draft video saved to ${await video.path()}`);
if (error) throw new Error(`The demo stopped: ${error}`);
