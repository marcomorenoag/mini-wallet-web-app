import { expect, test } from "@playwright/test";

test("root redirects anonymous visitors to the login page", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
});
