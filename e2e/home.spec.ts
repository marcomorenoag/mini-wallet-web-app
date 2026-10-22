import { expect, test } from "@playwright/test";

import { clearScenario, forceScenario, signIn } from "./support";

test.describe("home", () => {
  test("shows the greeting, balance and movements", async ({ page }) => {
    await signIn(page);

    await expect(page.getByRole("heading", { level: 1, name: "Hola, Ana" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Saldo disponible" })).toContainText(
      "$12,500.00",
    );

    const movements = page.getByRole("listitem");
    await expect(movements).toHaveCount(7);
    // Most recent first.
    await expect(movements.first()).toContainText("Recibido de Luis Pérez");
    await expect(movements.first()).toContainText("+$150.00");
    await expect(page.getByRole("link", { name: "Nueva transferencia" })).toHaveAttribute(
      "href",
      "/transfer",
    );
  });

  test("shows an empty state for an account without movements", async ({ page }) => {
    await signIn(page, "bruno@example.com");

    await expect(page.getByRole("heading", { name: "Aún no tienes movimientos" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Saldo disponible" })).toContainText("$500.00");
  });

  test("shows an error state and recovers on retry", async ({ page }) => {
    await signIn(page);
    await forceScenario(page, "NETWORK");
    await page.reload();

    await expect(
      page.getByRole("heading", { name: "No pudimos cargar tu información" }),
    ).toBeVisible();
    // The header stays usable above the error state.
    await expect(page.getByRole("button", { name: "Salir" })).toBeVisible();

    await clearScenario(page);
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByRole("region", { name: "Saldo disponible" })).toContainText(
      "$12,500.00",
    );
  });

  test("logs out and protects Home afterwards", async ({ page }) => {
    await signIn(page);

    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/home");
    await expect(page).toHaveURL(/\/login\?next=%2Fhome$/);
  });

  test("recovers from a stale session cookie", async ({ page }) => {
    await page.goto("/login");
    await page
      .context()
      .addCookies([{ name: "mw_session", value: "forged-token", url: page.url() }]);

    await page.goto("/home");

    await expect(page).toHaveURL(/\/login$/);
    const cookies = await page.context().cookies();
    expect(cookies.find(({ name }) => name === "mw_session")).toBeUndefined();
  });

  test("switches the theme from the header", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await signIn(page);

    await page.getByRole("button", { name: "Cambiar tema" }).click();
    await page.getByRole("menuitemradio", { name: "Oscuro" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});

test.describe("home without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  // Streamed sections are swapped in by inline scripts, so only the shell (header, CTA and
  // skeletons) is usable without JavaScript; logout is a plain form and still works.
  test("logs out through the Server Action", async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole("heading", { level: 1, name: "Hola, Ana" })).toBeVisible();

    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
