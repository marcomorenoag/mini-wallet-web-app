import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { clearScenario, forceScenario, signIn } from "./support";

// WCAG 2.1 A and AA rules, the level required for financial services in most jurisdictions.
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const expectNoViolations = async (page: Page) => {
  // Contrast is sampled from the rendered colors, so fades and color transitions are let finish.
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== "running"),
  );
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  // Only the rule ids, offending selectors and reasons are reported, so a failure is readable.
  const summary = violations.map(({ id, nodes }) => ({
    id,
    nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
  }));
  expect(summary).toEqual([]);
};

const reachSummary = async (page: Page) => {
  await signIn(page, "diana@example.com");
  await page.goto("/transfer");
  await page.getByLabel("Monto").fill("10");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\?step=recipient$/);
  await page.getByText("Luis Pérez").click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\?step=summary$/);
};

// Contrast is checked in both themes; the theme is stored before the first paint, as a user would.
for (const theme of ["light", "dark"] as const) {
  test.describe(`accessibility (${theme} theme)`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((value) => window.localStorage.setItem("mw-theme", value), theme);
    });

    test("login, including its validation errors", async ({ page }) => {
      await page.goto("/login");
      await expectNoViolations(page);

      await page.getByRole("button", { name: "Continuar" }).click();
      await expect(page.getByText("Ingresa tu teléfono o correo electrónico.")).toBeVisible();
      await expectNoViolations(page);
    });

    test("home with movements", async ({ page }) => {
      await signIn(page);
      await expect(page.getByRole("listitem").first()).toBeVisible();
      await expectNoViolations(page);
    });

    test("home empty state", async ({ page }) => {
      await signIn(page, "bruno@example.com");
      await expect(page.getByText("Aún no tienes movimientos")).toBeVisible();
      await expectNoViolations(page);
    });

    test("home error state", async ({ page }) => {
      await signIn(page);
      await forceScenario(page, "NETWORK");
      await page.reload();
      await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
      await expectNoViolations(page);
      await clearScenario(page);
    });

    test("every step of the transfer flow", async ({ page }) => {
      await signIn(page, "diana@example.com");
      await page.goto("/transfer");
      await page.getByLabel("Monto").fill("0");
      await page.getByRole("button", { name: "Continuar" }).click();
      await expect(page.getByLabel("Monto")).toHaveAttribute("aria-invalid", "true");
      await expectNoViolations(page);

      await page.getByLabel("Monto").fill("10");
      await page.getByRole("button", { name: "Continuar" }).click();
      await expect(page).toHaveURL(/\?step=recipient$/);
      await expectNoViolations(page);

      await page.getByText("Luis Pérez").click();
      await page.getByRole("button", { name: "Continuar" }).click();
      await expect(page).toHaveURL(/\?step=summary$/);
      await expectNoViolations(page);
    });

    test("failure screen and voucher", async ({ page }) => {
      await reachSummary(page);
      await forceScenario(page, "NETWORK");
      await page.getByRole("button", { name: "Confirmar" }).click();
      await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
      await expectNoViolations(page);

      await forceScenario(page, "SUCCESS");
      await page.getByRole("button", { name: "Reintentar" }).click();
      await expect(page.getByRole("heading", { name: "¡Transferencia exitosa!" })).toBeVisible();
      await expectNoViolations(page);
      await clearScenario(page);
    });

    test("not-found page", async ({ page }) => {
      await page.goto("/does-not-exist");
      await expectNoViolations(page);
    });
  });
}
