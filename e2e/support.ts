import { expect, type Page } from "@playwright/test";

/** Signs in through the login form and waits for Home. */
export const signIn = async (page: Page, identifier = "ana@example.com") => {
  await page.goto("/login");
  await page.getByLabel("Teléfono o correo electrónico").fill(identifier);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/home$/);
};

/** Forces a mock scenario for page navigations and Server Actions (`mock_scenario` cookie). */
export const forceScenario = (page: Page, scenario: string) =>
  page.context().addCookies([{ name: "mock_scenario", value: scenario, url: page.url() }]);

export const clearScenario = (page: Page) => page.context().clearCookies({ name: "mock_scenario" });
