import { expect, type Locator, type Page, test } from "@playwright/test";

import { forceScenario } from "./support";

// Keyboard navigation is a desktop concern; on touch devices the same controls are tapped.
test.skip(({ isMobile }) => isMobile, "Keyboard navigation is checked on desktop only");

/** Moves focus forward with Tab until the target is reached, as a keyboard user would. */
const tabTo = async (page: Page, target: Locator, maxPresses = 25) => {
  for (let presses = 0; presses < maxPresses; presses += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  await expect(target, "the target is never reached with Tab").toBeFocused();
};

test("a transfer can be completed with the keyboard only", async ({ page }) => {
  await page.goto("/login");
  await tabTo(page, page.getByLabel("Teléfono o correo electrónico"));
  await page.keyboard.type("diana@example.com");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/home$/);

  await tabTo(page, page.getByRole("link", { name: "Nueva transferencia" }));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/transfer$/);

  await tabTo(page, page.getByLabel("Monto"));
  await page.keyboard.type("15");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\?step=recipient$/);
  // Focus is moved to the step title, so screen readers announce the new step.
  await expect(page.getByRole("heading", { level: 2 })).toBeFocused();

  // One radio group: Tab enters it and the arrow keys move the selection.
  await tabTo(page, page.getByRole("radio").first());
  await page.keyboard.press("Space");
  await expect(page.getByRole("radio").first()).toBeChecked();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio").nth(1)).toBeChecked();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("radio").first()).toBeChecked();

  await tabTo(page, page.getByRole("button", { name: "Continuar" }));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\?step=summary$/);
  await expect(page.getByRole("heading", { level: 2 })).toBeFocused();

  await forceScenario(page, "SUCCESS");
  await tabTo(page, page.getByRole("button", { name: "Confirmar" }));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "¡Transferencia exitosa!" })).toBeVisible();

  await tabTo(page, page.getByRole("link", { name: "Volver al inicio" }));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/home$/);
});

test("the skip link moves focus past the header to the main content", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Teléfono o correo electrónico").fill("ana@example.com");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/home$/);

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Saltar al contenido" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

test("the theme menu can be operated with the keyboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Teléfono o correo electrónico").fill("ana@example.com");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/home$/);

  const toggle = page.getByRole("button", { name: /tema/i });
  await tabTo(page, toggle);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitemradio").first()).toBeFocused();
  await page.keyboard.press("Escape");
  // Radix returns focus to the trigger once the menu is dismissed.
  await expect(toggle).toBeFocused();
});
