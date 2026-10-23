import { expect, type Page, test } from "@playwright/test";

import { delayHydration, forceScenario, signIn } from "./support";

// Diana's account is reserved for flows that create transfers or contacts, since all specs share
// one in-memory database; Ana and Bruno keep the exact data that other specs assert on.
const startTransfer = async (page: Page) => {
  await signIn(page, "diana@example.com");
  await page.getByRole("link", { name: "Nueva transferencia" }).click();
  await expect(page).toHaveURL(/\/transfer$/);
};

const enterAmount = async (page: Page, amount: string) => {
  await page.getByLabel("Monto").fill(amount);
  await page.getByRole("button", { name: "Continuar" }).click();
};

const goToRecipient = async (page: Page, amount: string) => {
  await enterAmount(page, amount);
  await expect(page).toHaveURL(/\?step=recipient$/);
};

/** Digits no other test (or browser project) uses, so a saved contact never collides. */
const uniqueDigits = () => String(Date.now() % 1e8).padStart(8, "0");

test.describe("new transaction", () => {
  test("goes from amount to recipient to summary and confirms", async ({ page }) => {
    await startTransfer(page);
    await expect(page.getByText(/^Saldo disponible: \$[\d,]+\.\d{2}$/)).toBeVisible();

    await goToRecipient(page, "250.50");
    await page.getByText("Luis Pérez").click();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL(/\?step=summary$/);
    await expect(page.getByText("55 •••• 2222")).toBeVisible();
    await expect(page.getByText("MXN 250.50")).toBeVisible();

    await forceScenario(page, "SUCCESS");
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page).toHaveURL(/\/voucher\/trf_[\w-]+$/);
  });

  test("enforces the amount and recipient rules before moving on", async ({ page }) => {
    await startTransfer(page);

    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Ingresa un monto.")).toBeVisible();
    await enterAmount(page, "0");
    await expect(page.getByText("El monto debe ser mayor a cero.")).toBeVisible();
    await enterAmount(page, "1,000,000");
    await expect(page.getByText("El monto supera tu saldo.")).toBeVisible();
    await expect(page).toHaveURL(/\/transfer$/);

    await goToRecipient(page, "1");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Elige a quién enviarle dinero.")).toBeVisible();
  });

  test("saves a new contact as a favorite and selects it", async ({ page }) => {
    const digits = uniqueDigits();
    const name = `Sofía ${digits}`;
    await startTransfer(page);
    await goToRecipient(page, "100");

    await page.getByRole("button", { name: "Nuevo contacto" }).click();
    await page.getByLabel("Nombre").fill(name);
    await page.getByLabel("Teléfono").fill(`55${digits}`);
    await page.getByRole("button", { name: "Guardar en favoritos" }).click();

    await expect(page.getByRole("radio", { name: new RegExp(name) })).toBeChecked();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText(`55 •••• ${digits.slice(-4)}`)).toBeVisible();
  });

  test("rejects a contact that already exists", async ({ page }) => {
    await startTransfer(page);
    await goToRecipient(page, "100");

    await page.getByRole("button", { name: "Nuevo contacto" }).click();
    await page.getByLabel("Nombre").fill("Luis");
    await page.getByLabel("Teléfono").fill("55 1111 2222");
    await page.getByRole("button", { name: "Guardar en favoritos" }).click();

    await expect(page.getByText("Ya tienes un contacto con ese teléfono.")).toBeVisible();
  });

  test("keeps the step in the URL for browser navigation", async ({ page }) => {
    await startTransfer(page);
    await goToRecipient(page, "100");
    await page.getByText("Luis Pérez").click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page).toHaveURL(/\?step=summary$/);

    await page.goBack();
    await expect(page).toHaveURL(/\?step=recipient$/);
    await expect(page.getByRole("radio", { name: /Luis Pérez/ })).toBeChecked();

    await page.getByRole("link", { name: "Regresar" }).click();
    await expect(page).toHaveURL(/\?step=amount$/);
    await expect(page.getByLabel("Monto")).toHaveValue("100");
  });

  test("changes steps instantly, without a request to the server", async ({ page }) => {
    await startTransfer(page);
    // Client-side navigations fetch the RSC payload of the page, flagged by the `rsc` header.
    const serverRequests: string[] = [];
    page.on("request", (request) => {
      if (request.headers()["rsc"]) serverRequests.push(request.url());
    });

    await goToRecipient(page, "100");
    await page.getByText("Luis Pérez").click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page).toHaveURL(/\?step=summary$/);
    await page.getByRole("link", { name: "Regresar" }).click();
    await expect(page).toHaveURL(/\?step=recipient$/);
    await page.goBack();
    await expect(page).toHaveURL(/\?step=summary$/);

    expect(serverRequests).toEqual([]);
  });

  test("keeps an amount typed before the page is interactive", async ({ page, browserName }) => {
    // The page is streamed behind `loading.tsx`; WebKit only reveals the streamed content once the
    // held-back scripts load, so the field cannot be reached before hydration there.
    test.skip(browserName === "webkit", "Streamed content is not revealed without the scripts");
    await signIn(page, "diana@example.com");
    const { hydrate } = await delayHydration(page);
    await page.goto("/transfer", { waitUntil: "commit" });
    await page.getByLabel("Monto").fill("100");
    await hydrate();

    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page).toHaveURL(/\?step=recipient$/);
  });

  test("restarts at the amount step after a refresh", async ({ page }) => {
    await startTransfer(page);
    await goToRecipient(page, "100");
    await page.reload();

    await expect(page).toHaveURL(/\?step=amount$/);
    await expect(page.getByLabel("Monto")).toHaveValue("");
  });

  test("shows an error state when the flow cannot be loaded", async ({ page }) => {
    await signIn(page);
    await forceScenario(page, "NETWORK");
    await page.goto("/transfer");

    await expect(
      page.getByRole("heading", { name: "No pudimos preparar tu transferencia" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Volver al inicio" })).toBeVisible();
  });
});
