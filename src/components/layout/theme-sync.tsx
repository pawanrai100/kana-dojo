"use client";

import { useEffect } from "react";
import { useAppState } from "@/store/app-store";

// keeps the html .dark class in line with settings
export function ThemeSync() {
  const theme = useAppState()?.settings.theme;

  useEffect(() => {
    if (!theme) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  return null;
}
