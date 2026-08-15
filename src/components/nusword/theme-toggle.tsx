"use client";
import * as React from "react";
import { useTheme } from "next-themes";
import { Icon } from "./icon";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return null; // avoid hydration mismatch

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex size-10 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-surface-container-low"
    >
      <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} className="text-on-surface-variant" />
    </button>
  );
}
