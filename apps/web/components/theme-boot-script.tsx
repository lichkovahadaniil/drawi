import Script from "next/script";
import {
  DRAWI_THEME_COOKIE,
  DRAWI_THEME_MAX_AGE,
  DRAWI_THEME_STORAGE_KEY,
  type DrawiTheme,
} from "@/components/theme";

export function ThemeBootScript({ initialTheme }: { initialTheme: DrawiTheme }) {
  const script = `
(function () {
  var fallback = ${JSON.stringify(initialTheme)};
  var storageKey = ${JSON.stringify(DRAWI_THEME_STORAGE_KEY)};
  var cookieName = ${JSON.stringify(DRAWI_THEME_COOKIE)};
  var maxAge = ${JSON.stringify(DRAWI_THEME_MAX_AGE)};
  var theme = fallback;

  try {
    var match = document.cookie.match(new RegExp("(?:^|; )" + cookieName + "=([^;]*)"));
    var cookieTheme = match ? decodeURIComponent(match[1]) : null;
    if (cookieTheme === "day" || cookieTheme === "night") {
      theme = cookieTheme;
    }

    var stored = window.localStorage.getItem(storageKey);
    if (stored === "day" || stored === "night") {
      theme = stored;
    }
  } catch (error) {}

  document.documentElement.dataset.drawiTheme = theme;
  document.documentElement.style.colorScheme = theme === "night" ? "dark" : "light";
  document.cookie = cookieName + "=" + theme + "; path=/; max-age=" + maxAge + "; SameSite=Lax";
})();
`;

  return (
    <Script
      id="drawi-theme-boot"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
