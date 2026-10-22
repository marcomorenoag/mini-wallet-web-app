import { expect, test, type Page } from "@playwright/test";

const login = async (page: Page, identifier: string) => {
  await page.getByLabel("Teléfono o correo electrónico").fill(identifier);
  await page.getByRole("button", { name: "Continuar" }).click();
};

const forceScenario = (page: Page, scenario: string) =>
  page.context().addCookies([{ name: "mock_scenario", value: scenario, url: page.url() }]);

test.describe("login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("starts a session with an email and goes home", async ({ page }) => {
    await login(page, "ana@example.com");

    await expect(page).toHaveURL(/\/home$/);
    const cookies = await page.context().cookies();
    expect(cookies.find(({ name }) => name === "mw_session")).toMatchObject({ httpOnly: true });
  });

  test("accepts a formatted phone number", async ({ page }) => {
    await login(page, "55 1234 5678");
    await expect(page).toHaveURL(/\/home$/);
  });

  test("validates the identifier before submitting", async ({ page }) => {
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Ingresa tu teléfono o correo electrónico.")).toBeVisible();

    await login(page, "not-an-email");
    await expect(page.getByText("Ingresa un teléfono o correo válido.")).toBeVisible();
    await expect(page.getByLabel("Teléfono o correo electrónico")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page).toHaveURL(/\/login$/);
  });

  test("reports an unknown account from the server", async ({ page }) => {
    await login(page, "nobody@example.com");

    await expect(page.getByText("No encontramos una cuenta con esos datos.")).toBeVisible();
    await expect(page.getByLabel("Teléfono o correo electrónico")).toHaveValue(
      "nobody@example.com",
    );
  });

  test("shows a banner on a simulated network failure", async ({ page }) => {
    await forceScenario(page, "NETWORK");
    await login(page, "ana@example.com");

    const alert = page.getByRole("alert").filter({ hasText: "No pudimos iniciar sesión" });
    await expect(alert).toContainText("Hubo un problema de conexión. Intenta de nuevo.");
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("login redirects", () => {
  test("returns to the protected page that was requested", async ({ page }) => {
    await page.goto("/transfer?step=amount");
    await expect(page).toHaveURL(/\/login\?next=%2Ftransfer%3Fstep%3Damount$/);

    await login(page, "ana@example.com");
    await expect(page).toHaveURL(/\/transfer\?step=amount$/);
  });

  test("ignores external destinations", async ({ page }) => {
    await page.goto("/login?next=//evil.example");
    await login(page, "ana@example.com");

    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/home$/);
  });

  test("sends signed-in users away from the login page", async ({ page }) => {
    await page.goto("/login");
    await login(page, "ana@example.com");
    await expect(page).toHaveURL(/\/home$/);

    await page.goto("/login");
    await expect(page).toHaveURL(/\/home$/);
  });
});

test.describe("login without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("still validates and signs in through the Server Action", async ({ page }) => {
    await page.goto("/login");

    await login(page, "nobody@example.com");
    await expect(page.getByText("No encontramos una cuenta con esos datos.")).toBeVisible();

    await login(page, "ana@example.com");
    await expect(page).toHaveURL(/\/home$/);
  });
});
