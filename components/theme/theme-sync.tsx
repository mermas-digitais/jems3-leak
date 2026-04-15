"use client";

import { useEffect } from "react";

import { useSessionStore } from "../../stores/session-store";

const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export function ThemeSync() {
  const theme = useSessionStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia(DARK_MEDIA_QUERY);

    const applyTheme = () => {
      const useDark = theme === "dark" || (theme === "system" && media.matches);

      root.classList.toggle("dark", useDark);
      root.dataset.theme = theme;
      root.style.colorScheme = useDark ? "dark" : "light";
    };

    applyTheme();
    media.addEventListener("change", applyTheme);

    return () => {
      media.removeEventListener("change", applyTheme);
    };
  }, [theme]);

  return null;
}