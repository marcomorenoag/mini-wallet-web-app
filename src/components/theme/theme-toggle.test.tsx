import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { THEME_ATTRIBUTE, THEME_STORAGE_KEY } from "./theme";
import { ThemeToggle } from "./theme-toggle";

const root = document.documentElement;

const choose = async (name: string) => {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Cambiar tema" }));
  await user.click(await screen.findByRole("menuitemradio", { name }));
};

afterEach(() => {
  localStorage.clear();
  root.removeAttribute(THEME_ATTRIBUTE);
});

describe("ThemeToggle", () => {
  it("offers light, dark and system, with system selected by default", async () => {
    renderWithIntl(<ThemeToggle />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Cambiar tema" }));

    const options = await screen.findAllByRole("menuitemradio");
    expect(options.map((option) => option.textContent)).toEqual(["Claro", "Oscuro", "Sistema"]);
    expect(screen.getByRole("menuitemradio", { name: "Sistema" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("applies and remembers an explicit choice", async () => {
    renderWithIntl(<ThemeToggle />);
    await choose("Oscuro");

    expect(root).toHaveAttribute(THEME_ATTRIBUTE, "dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("goes back to following the system", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    root.setAttribute(THEME_ATTRIBUTE, "light");
    renderWithIntl(<ThemeToggle />);

    await choose("Sistema");

    expect(root).not.toHaveAttribute(THEME_ATTRIBUTE);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("follows a choice made in another tab", async () => {
    renderWithIntl(<ThemeToggle />);

    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: THEME_STORAGE_KEY }));
    });

    expect(root).toHaveAttribute(THEME_ATTRIBUTE, "dark");
  });
});
