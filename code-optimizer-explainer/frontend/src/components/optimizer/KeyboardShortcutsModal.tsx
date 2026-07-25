import { useEffect } from "react";
import { X, Command, Keyboard } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: "Ctrl + Enter", desc: "Execute active AI action on entered code" },
  { key: "/", desc: "Open floating slash commands popover" },
  { key: "Esc", desc: "Close open popovers, menus & modals" },
  { key: "Tab", desc: "Select & complete highlighted slash command" },
  { key: "Ctrl + K", desc: "Clear composer input box" },
  { key: "?", desc: "Toggle keyboard shortcuts cheat sheet" },
];

export function KeyboardShortcutsModal({ isOpen, onClose }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-5 text-[var(--text-primary)] animate-pop-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--accent-muted)] text-[var(--accent)]">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-headings">Keyboard Shortcuts</h2>
              <p className="text-xs text-[var(--text-secondary)]">Power-user efficiency cheatsheet</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts modal"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)] transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="space-y-2">
          {SHORTCUTS.map((sc) => (
            <div
              key={sc.key}
              className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]"
            >
              <span className="text-xs text-[var(--text-secondary)] font-medium">{sc.desc}</span>
              <kbd className="px-2 py-1 rounded bg-[var(--bg-surface)] text-[11px] font-mono font-bold text-[var(--accent)] border border-[var(--border-default)] shadow-2xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono">
          <div className="flex items-center gap-1.5">
            <Command className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>OptiCode Power-User Commands</span>
          </div>
          <span>Press ESC to dismiss</span>
        </div>
      </div>
    </div>
  );
}
