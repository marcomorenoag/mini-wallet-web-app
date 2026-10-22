import { expect, type Page, test } from "@playwright/test";

import { clearScenario, forceScenario, signIn } from "./support";

/** Prepares a transfer for Diana (the account reserved for flows that create transfers). */
const reachSummary = async (page: Page, amount = "100") => {
  await signIn(page, "diana@example.com");
  await page.goto("/transfer");
  await page.getByLabel("Monto").fill(amount);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\?step=recipient$/);
  await page.getByText("Luis Pérez").click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\?step=summary$/);
};

const confirmWith = async (page: Page, scenario: string) => {
  await forceScenario(page, scenario);
  await page.getByRole("button", { name: "Confirmar" }).click();
};

const failure = (page: Page) =>
  page.getByRole("alert").filter({ hasText: "No pudimos completar la transferencia" });

test.describe("confirmation and voucher", () => {
  test("SUCCESS shows a voucher that survives a refresh", async ({ page }) => {
    await reachSummary(page, "123.45");
    await confirmWith(page, "SUCCESS");

    await expect(page).toHaveURL(/\/voucher\/trf_[\w-]+$/);
    await expect(page.getByRole("heading", { name: "¡Transferencia exitosa!" })).toBeVisible();
    const details = page.getByRole("region", { name: "¡Transferencia exitosa!" });
    await expect(details).toContainText(/TX-[0-9A-F]{8}/);
    await expect(details).toContainText("Luis Pérez · 55 •••• 2222");
    await expect(details).toContainText("Completada");

    await clearScenario(page);
    await page.reload();
    await expect(details).toContainText("$123.45");

    await page.getByRole("link", { name: "Volver al inicio" }).click();
    await expect(
      page.getByRole("listitem").filter({ hasText: "Envío a Luis Pérez" }).first(),
    ).toBeVisible();
  });

  test("INSUFFICIENT_FUNDS explains the reason and offers to change the amount", async ({
    page,
  }) => {
    await reachSummary(page);
    await confirmWith(page, "INSUFFICIENT_FUNDS");

    await expect(failure(page)).toContainText("Tu saldo no alcanza para esta transferencia.");
    await expect(page.getByRole("button", { name: "Reintentar" })).toHaveCount(0);

    await page.getByRole("button", { name: "Cambiar monto" }).click();
    await expect(page).toHaveURL(/\?step=amount$/);
    await expect(page.getByLabel("Monto")).toHaveValue("100");
  });

  test("NETWORK can be retried safely with the same key", async ({ page }) => {
    await reachSummary(page);
    await confirmWith(page, "NETWORK");
    await expect(failure(page)).toContainText("No se hizo ningún cargo");

    await forceScenario(page, "SUCCESS");
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page).toHaveURL(/\/voucher\/trf_[\w-]+$/);
  });

  test("TIMEOUT is recovered by idempotency key instead of being resent", async ({ page }) => {
    await reachSummary(page);
    const posts: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith("/api/v1/transfers")) {
        posts.push(request.url());
      }
    });

    await confirmWith(page, "TIMEOUT");
    await expect(page.getByText("Estamos confirmando tu transferencia")).toBeVisible();
    // The slow approval completes on the server and is picked up by the status checks.
    await clearScenario(page);
    await expect(page).toHaveURL(/\/voucher\/trf_[\w-]+$/, { timeout: 15_000 });
    expect(posts).toHaveLength(1);
  });

  test("UNKNOWN shows a generic failure with a retry", async ({ page }) => {
    await reachSummary(page);
    await confirmWith(page, "UNKNOWN");

    await expect(failure(page)).toContainText("Ocurrió un error inesperado.");
    await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Volver al inicio" })).toBeVisible();
  });

  test("a voucher is only visible to its owner", async ({ page, browser }) => {
    await reachSummary(page);
    await confirmWith(page, "SUCCESS");
    await expect(page).toHaveURL(/\/voucher\/trf_[\w-]+$/);
    const voucherPath = new URL(page.url()).pathname;

    const other = await browser.newPage();
    await signIn(other, "bruno@example.com");
    const response = await other.goto(voucherPath);
    expect(response?.status()).toBe(404);
    await expect(other.getByRole("heading", { name: "Página no encontrada" })).toBeVisible();
    await other.close();
  });
});
