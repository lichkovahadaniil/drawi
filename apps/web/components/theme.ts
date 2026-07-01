export const DRAWI_THEME_COOKIE = "drawi_theme";
export const DRAWI_THEME_STORAGE_KEY = "drawi:theme";
export const DRAWI_THEME_MAX_AGE = 60 * 60 * 24 * 365;

export type DrawiTheme = "day" | "night";

export function isDrawiTheme(value: string | null | undefined): value is DrawiTheme {
  return value === "day" || value === "night";
}

export function normalizeDrawiTheme(value: string | null | undefined): DrawiTheme {
  return isDrawiTheme(value) ? value : "day";
}

export function getStoredDrawiTheme(fallback: DrawiTheme): DrawiTheme {
  if (typeof window === "undefined") return fallback;

  try {
    return normalizeDrawiTheme(window.localStorage.getItem(DRAWI_THEME_STORAGE_KEY) ?? fallback);
  } catch {
    return fallback;
  }
}

export function persistDrawiTheme(theme: DrawiTheme) {
  if (typeof document === "undefined") return;

  document.documentElement.dataset.drawiTheme = theme;
  document.documentElement.style.colorScheme = theme === "night" ? "dark" : "light";

  try {
    window.localStorage.setItem(DRAWI_THEME_STORAGE_KEY, theme);
  } catch {
    // Local storage can be unavailable in private or restricted contexts.
  }

  document.cookie = `${DRAWI_THEME_COOKIE}=${theme}; path=/; max-age=${DRAWI_THEME_MAX_AGE}; SameSite=Lax`;
}
