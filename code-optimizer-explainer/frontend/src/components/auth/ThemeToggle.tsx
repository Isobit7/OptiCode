import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  theme: "light" | "dark";
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-(--auth-border) bg-(--auth-paper) text-(--auth-muted) shadow-sm transition hover:border-(--auth-accent) hover:text-(--auth-accent) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--auth-accent)/30 focus-visible:ring-offset-2 focus-visible:ring-offset-(--auth-pearl)"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
