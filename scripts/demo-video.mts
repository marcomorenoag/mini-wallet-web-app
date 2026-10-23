/**
 * Scripted product demo, meant to be screen-recorded. The app is played in a phone-sized browser
 * at a human pace, with a ripple on every tap and full-screen title cards between scenes. Each
 * outcome is forced through the `mock_scenario` cookie, so every take is identical.
 *
 *   make dev                 # or a production build started with MOCK_SCENARIO_OVERRIDE=enabled
 *   make demo                # start a screen recording of the browser window first
 *   make demo RECORD=1       # also saves a draft video to demo-video/ (Playwright's recorder)
 *
 * Environment: DEMO_URL (default http://localhost:3000), DEMO_BROWSER (chromium | webkit),
 * DEMO_RECORD (saves a draft video), DEMO_SPEED (pause multiplier, default 1) and DEMO_HEADLESS.
 * The demo signs in as Ana and creates two transfers; restarting the server resets the data.
 */
import { chromium, devices, type Locator, type Page, webkit } from "@playwright/test";

const BASE_URL = process.env.DEMO_URL ?? "http://localhost:3000";
const SPEED = Number(process.env.DEMO_SPEED) || 1;
const RECORD_DIR = process.env.DEMO_RECORD ? "demo-video" : null;
const DEVICE = devices["iPhone 15"];

declare global {
  interface Window {
    __demo: {
      ripple: (x: number, y: number) => void;
      showCard: (title: string, subtitle: string) => void;
      hideCard: () => void;
    };
  }
}

/** Visual helpers, installed on every page before the app runs. */
const installDemoHelpers = () => {
  const BRAND = "linear-gradient(100deg, #8b8ff0 0%, #5458c6 45%, #f86500 100%)";
  const css = `
    .demo-ripple { position: fixed; z-index: 2147483646; width: 44px; height: 44px;
      margin: -22px 0 0 -22px; border-radius: 50%; pointer-events: none;
      background: rgba(84, 88, 198, 0.35); animation: demo-ripple 520ms ease-out forwards; }
    @keyframes demo-ripple { from { transform: scale(0.4); opacity: 1; }
      to { transform: scale(1.6); opacity: 0; } }
    .demo-card { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-content: center;
      gap: 14px; padding: 32px; text-align: center; background: #0b0b10; opacity: 0;
      transition: opacity 600ms ease; font-family: -apple-system, "SF Pro Display", system-ui, sans-serif; }
    .demo-card.is-visible { opacity: 1; }
    .demo-card h1 { margin: 0; font-size: 40px; line-height: 1.1; font-weight: 800;
      letter-spacing: -0.03em; background: ${BRAND}; -webkit-background-clip: text;
      background-clip: text; color: transparent; transform: translateY(14px);
      transition: transform 900ms cubic-bezier(0.2, 0.8, 0.2, 1); }
    .demo-card.is-visible h1 { transform: none; }
    .demo-card p { margin: 0; font-size: 18px; line-height: 1.4; color: #c9c9d6; }`;

  const ensureStyles = () => {
    if (document.getElementById("demo-styles")) return;
    const style = document.createElement("style");
    style.id = "demo-styles";
    style.textContent = css;
    document.head.append(style);
  };

  window.__demo = {
    ripple(x, y) {
      ensureStyles();
      const dot = document.createElement("div");
      dot.className = "demo-ripple";
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;
      document.body.append(dot);
      setTimeout(() => dot.remove(), 600);
    },
    showCard(title, subtitle) {
      ensureStyles();
      const card = document.createElement("div");
      card.className = "demo-card";
      const heading = document.createElement("h1");
      heading.textContent = title;
      const text = document.createElement("p");
      text.textContent = subtitle;
      card.append(heading, text);
      document.body.append(card);
      requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add("is-visible")));
    },
    hideCard() {
      for (const card of document.querySelectorAll(".demo-card")) {
        card.classList.remove("is-visible");
        setTimeout(() => card.remove(), 650);
      }
    },
  };

  // The demo always starts in the light theme; the theme scene switches to dark afterwards.
  if (!sessionStorage.getItem("demo-started")) {
    sessionStorage.setItem("demo-started", "1");
    localStorage.setItem("mw-theme", "light");
  }
};

const browserType = process.env.DEMO_BROWSER === "webkit" ? webkit : chromium;
const browser = await browserType.launch({ headless: Boolean(process.env.DEMO_HEADLESS) });
const context = await browser.newContext({
  ...DEVICE,
  // Playwright records at the viewport size (no upscaling); the draft is for reviewing the timing.
  ...(RECORD_DIR ? { recordVideo: { dir: RECORD_DIR, size: DEVICE.viewport } } : {}),
});
await context.addInitScript(installDemoHelpers);
const page = await context.newPage();

const pause = (ms: number) => page.waitForTimeout(ms * SPEED);

const forceOutcome = (scenario: "SUCCESS" | "NETWORK") =>
  context.addCookies([{ name: "mock_scenario", value: scenario, url: BASE_URL }]);

/** Shows a ripple where a finger would land, then taps. */
const tap = async (target: Locator) => {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (box) {
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.evaluate(({ x, y }) => window.__demo.ripple(x, y), point);
  }
  await pause(220);
  await target.click();
};

const type = async (target: Locator, text: string) => {
  await tap(target);
  await target.pressSequentially(text, { delay: 110 * SPEED });
};

/** Full-screen title card between scenes. */
const card = async (title: string, subtitle: string, holdMs = 2400) => {
  await page.evaluate(({ t, s }) => window.__demo.showCard(t, s), { t: title, s: subtitle });
  await pause(holdMs + 600);
  await page.evaluate(() => window.__demo.hideCard());
  await pause(700);
};

const button = (p: Page, name: string) => p.getByRole("button", { name, exact: true });

/** Amount → recipient → summary, ending on the "Confirmar" button. */
const prepareTransfer = async (amount: string, recipient: string) => {
  await tap(page.getByRole("link", { name: "Nueva transferencia" }));
  await page.getByLabel("Monto").waitFor();
  await pause(700);
  await type(page.getByLabel("Monto"), amount);
  await pause(500);
  await tap(button(page, "Continuar"));
  await page.getByRole("radio").first().waitFor();
  await pause(900);
  await tap(page.getByText(recipient));
  await pause(500);
  await tap(button(page, "Continuar"));
  await button(page, "Confirmar").waitFor();
  await pause(1600);
};

// ── 1. Opening ──
await page.goto(`${BASE_URL}/login`);
await page.getByLabel("Teléfono o correo electrónico").waitFor();
await card("Mini Wallet", "Tu dinero, a un toque de distancia.", 2600);

// ── 2. Login → Home ──
await type(page.getByLabel("Teléfono o correo electrónico"), "ana@example.com");
await pause(400);
await tap(button(page, "Continuar"));
await page.waitForURL(/\/home$/);
await page.getByRole("listitem").first().waitFor();
await pause(2200);

// ── 3. A transfer in three steps ──
await card("Tres pasos.", "Monto, destinatario y confirmación.");
await prepareTransfer("250", "Luis Pérez");
await forceOutcome("SUCCESS");
await tap(button(page, "Confirmar"));
await page.getByRole("heading", { name: "¡Transferencia exitosa!" }).waitFor();
await pause(2800);

// ── 4. Failures explain what to do next ──
await tap(page.getByRole("link", { name: "Volver al inicio" }));
await page.waitForURL(/\/home$/);
await card("Siempre sabes qué pasó.", "Cada error te dice qué hacer después.");
await prepareTransfer("120", "Marta Ruiz");
await forceOutcome("NETWORK");
await tap(button(page, "Confirmar"));
await button(page, "Reintentar").waitFor();
await pause(2600);
await forceOutcome("SUCCESS");
await tap(button(page, "Reintentar"));
await page.getByRole("heading", { name: "¡Transferencia exitosa!" }).waitFor();
await pause(2000);

// ── 5. Light or dark ──
await tap(page.getByRole("link", { name: "Volver al inicio" }));
await page.waitForURL(/\/home$/);
await page.getByRole("listitem").first().waitFor();
await card("Claro u oscuro.", "Como tú prefieras.", 2000);
await tap(page.getByRole("button", { name: "Cambiar tema" }));
await pause(600);
await tap(page.getByRole("menuitemradio", { name: "Oscuro" }));
await pause(1800);
await page.mouse.wheel(0, 400);
await pause(1800);

// ── 6. Closing ──
await card("Mini Wallet", "Inicio · Transferencia · Comprobante", 3200);

await context.clearCookies({ name: "mock_scenario" });
const video = page.video();
await context.close();
await browser.close();
if (video) console.log(`Draft video saved to ${await video.path()}`);
