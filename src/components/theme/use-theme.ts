"use client";

import { useCallback, useSyncExternalStore } from "react";

import { applyTheme, readStoredTheme, storeTheme, THEME_STORAGE_KEY, type Theme } from "./theme";

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  // Keeps every open tab in sync when the choice is changed in another one.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    applyTheme(readStoredTheme());
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

/** The server cannot know the stored choice, so it renders as "system" until hydrated. */
const getServerSnapshot = (): Theme => "system";

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readStoredTheme, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => {
    storeTheme(next);
    applyTheme(next);
    notify();
  }, []);

  return { theme, setTheme };
}
