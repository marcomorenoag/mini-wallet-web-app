/**
 * Theme preference: an explicit light or dark choice is stored and pinned on `<html>` through
 * `data-theme`; "system" removes both, so the CSS follows `prefers-color-scheme`.
 */
export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];
type ExplicitTheme = Exclude<Theme, "system">;

export const THEME_STORAGE_KEY = "mw-theme";
export const THEME_ATTRIBUTE = "data-theme";

export const isTheme = (value: unknown): value is Theme =>
  (THEMES as readonly unknown[]).includes(value);

const isExplicitTheme = (value: unknown): value is ExplicitTheme =>
  value === "light" || value === "dark";

/** Storage can be unavailable (private mode, blocked cookies); "system" is the fallback. */
export const readStoredTheme = (): Theme => {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isExplicitTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
};

export const storeTheme = (theme: Theme): void => {
  try {
    if (theme === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The choice still applies to the current page; it is just not remembered.
  }
};

export const applyTheme = (theme: Theme, root: HTMLElement = document.documentElement): void => {
  if (isExplicitTheme(theme)) root.setAttribute(THEME_ATTRIBUTE, theme);
  else root.removeAttribute(THEME_ATTRIBUTE);
};

/**
 * Inlined in `<head>` and run before the first paint, so a stored choice never flashes the
 * system theme. It mirrors `readStoredTheme` + `applyTheme` and must stay dependency-free.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark")document.documentElement.setAttribute(${JSON.stringify(
  THEME_ATTRIBUTE,
)},t)}catch(e){}})()`;
