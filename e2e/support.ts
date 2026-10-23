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

/**
 * Holds back the app's scripts until `release()` is called, so a page can be used before React
 * hydrates it (autofill, or a fast typist on a slow phone). Stylesheets are not held back, since
 * they block rendering.
 */
export const delayHydration = async (page: Page) => {
  let release = () => {};
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route(/\/_next\/static\/chunks\/.+\.js(\?.*)?$/, async (route) => {
    await released;
    await route.continue();
  });
  return {
    /** Lets the scripts load and waits until the given form is hydrated. */
    hydrate: async (form = "form") => {
      release();
      await page.waitForFunction(
        (selector) =>
          Object.keys(document.querySelector(selector) ?? {}).some((key) =>
            key.startsWith("__reactProps"),
          ),
        form,
      );
    },
  };
};
