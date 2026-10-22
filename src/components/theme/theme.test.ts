import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyTheme,
  readStoredTheme,
  storeTheme,
  THEME_ATTRIBUTE,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
} from "./theme";

const root = document.documentElement;

afterEach(() => {
  localStorage.clear();
  root.removeAttribute(THEME_ATTRIBUTE);
});

describe("theme preference", () => {
  it("stores explicit choices and forgets the system one", () => {
    storeTheme("dark");
    expect(readStoredTheme()).toBe("dark");

    storeTheme("system");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(readStoredTheme()).toBe("system");
  });

  it("falls back to system for unknown values or unavailable storage", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    expect(readStoredTheme()).toBe("system");

    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(readStoredTheme()).toBe("system");
  });

  it("pins explicit choices on the root element and removes the pin for system", () => {
    applyTheme("light");
    expect(root).toHaveAttribute(THEME_ATTRIBUTE, "light");

    applyTheme("system");
    expect(root).not.toHaveAttribute(THEME_ATTRIBUTE);
  });
});

describe("THEME_INIT_SCRIPT", () => {
  const run = () => new Function(THEME_INIT_SCRIPT)();

  it("applies a stored choice", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    run();
    expect(root).toHaveAttribute(THEME_ATTRIBUTE, "dark");
  });

  it("ignores unknown values and storage failures", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "<script>");
    run();
    expect(root).not.toHaveAttribute(THEME_ATTRIBUTE);

    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(run).not.toThrow();
  });
});
