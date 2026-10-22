import { expect, test, type Locator, type Page } from "@playwright/test";

type Rgb = readonly [number, number, number];

// sRGB values of the background and primary tokens (see src/styles/tokens.css).
const LIGHT = { background: [248, 248, 248], primary: [84, 88, 198] } satisfies Record<string, Rgb>;
const DARK = { background: [14, 15, 22], primary: [144, 156, 246] } satisfies Record<string, Rgb>;

// Any page renders the shell; the not-found page needs no session.
const PAGE = "/does-not-exist";

/**
 * Computed colors are serialized differently per browser and build (`rgb()`, `lab()`, `oklch()`),
 * so the background is painted on a canvas and read back as sRGB.
 */
const backgroundRgb = (locator: Locator): Promise<Rgb> =>
  locator.evaluate((element) => {
    const context = document.createElement("canvas").getContext("2d", {
      willReadFrequently: true,
    })!;
    context.fillStyle = getComputedStyle(element).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
    return [r!, g!, b!] as const;
  });

const expectBackground = async (locator: Locator, expected: Rgb) => {
  await expect
    .poll(async () => {
      const actual = await backgroundRgb(locator);
      // Allows for rounding between color spaces.
      return actual.every((channel, i) => Math.abs(channel - expected[i]!) <= 2) || actual;
    })
    .toBe(true);
};

const expectColors = async (page: Page, colors: typeof LIGHT) => {
  await expectBackground(page.locator("body"), colors.background);
  await expectBackground(page.getByRole("link", { name: "Volver al inicio" }), colors.primary);
};

const storeTheme = (page: Page, theme: "light" | "dark") =>
  page.addInitScript((value) => localStorage.setItem("mw-theme", value), theme);

test.describe("theme", () => {
  test("follows the system preference by default", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(PAGE);
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    await expectColors(page, DARK);

    await page.emulateMedia({ colorScheme: "light" });
    await expectColors(page, LIGHT);
  });

  test("an explicit dark choice overrides a light system preference", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await storeTheme(page, "dark");
    await page.goto(PAGE);

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expectColors(page, DARK);
  });

  test("an explicit light choice overrides a dark system preference", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await storeTheme(page, "light");
    await page.goto(PAGE);

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expectColors(page, LIGHT);
  });

  test("the stored choice is applied before the first paint", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await storeTheme(page, "dark");
    // Recorded as soon as the body is parsed, before any client JavaScript has run.
    await page.addInitScript(() => {
      document.addEventListener(
        "readystatechange",
        () => {
          (window as unknown as { themeAtParse?: string | null }).themeAtParse =
            document.documentElement.getAttribute("data-theme");
        },
        { once: true },
      );
    });
    await page.goto(PAGE);

    expect(
      await page.evaluate(() => (window as { themeAtParse?: string | null }).themeAtParse),
    ).toBe("dark");
  });
});
