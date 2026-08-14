"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="h-10 w-10 rounded-xl border border-slate-200 bg-white"
        aria-label="Toggle theme"
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() =>
        setTheme(isDark ? "light" : "dark")
      }
      className="
        flex h-10 w-10 items-center justify-center
        rounded-xl
        border border-slate-200
        bg-white
        text-slate-700
        transition
        hover:bg-slate-100
        dark:border-slate-700
        dark:bg-slate-900
        dark:text-slate-200
        dark:hover:bg-slate-800
      "
      aria-label={
        isDark
          ? "Switch to light mode"
          : "Switch to dark mode"
      }
    >
      {isDark ? (
        <Sun size={19} />
      ) : (
        <Moon size={19} />
      )}
    </button>
  );
}