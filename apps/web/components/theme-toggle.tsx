"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getStoredDrawiTheme,
  persistDrawiTheme,
  type DrawiTheme,
  DRAWI_THEME_STORAGE_KEY,
} from "@/components/theme";

const THEMES: Array<{
  value: DrawiTheme;
  label: string;
  Icon: typeof Sun;
}> = [
  { value: "day", label: "Day", Icon: Sun },
  { value: "night", label: "Night", Icon: Moon },
];

export function ThemeToggle({ initialTheme }: { initialTheme: DrawiTheme }) {
  const [theme, setTheme] = useState<DrawiTheme>(initialTheme);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedTheme = getStoredDrawiTheme(initialTheme);
      setTheme(storedTheme);
      persistDrawiTheme(storedTheme);
    });

    function handleStorage(event: StorageEvent) {
      if (event.key !== DRAWI_THEME_STORAGE_KEY) return;
      const nextTheme = getStoredDrawiTheme(initialTheme);
      setTheme(nextTheme);
      persistDrawiTheme(nextTheme);
    }

    window.addEventListener("storage", handleStorage);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("storage", handleStorage);
    };
  }, [initialTheme]);

  function updateTheme(nextTheme: DrawiTheme) {
    setTheme(nextTheme);
    persistDrawiTheme(nextTheme);
  }

  return (
    <div className="drawi-theme-panel">
      <div>
        <h2>Appearance</h2>
        <p>Theme is saved for this browser.</p>
      </div>
      <div className="drawi-theme-toggle" role="group" aria-label="Color theme">
        {THEMES.map(({ value, label, Icon }) => {
          const isSelected = theme === value;

          return (
            <button
              key={value}
              type="button"
              className="drawi-theme-toggle-option"
              data-selected={isSelected ? "true" : "false"}
              aria-pressed={isSelected}
              onClick={() => updateTheme(value)}
            >
              <Icon aria-hidden="true" size={18} strokeWidth={2.2} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
