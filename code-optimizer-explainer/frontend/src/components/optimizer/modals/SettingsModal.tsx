import { useEffect } from "react";
import { X, Moon, Sun, UserRound, Languages, AlignLeft, Copy, Maximize2, ScanText, Type } from "lucide-react";
import type { UserSettings, FontSize, ResponseLength, OutputFormat, MaxLines } from "@/hooks/useSettings";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  currentUser: any;
  onSignIn: () => void;
  onSignOut: () => void;
  settings: UserSettings;
  onSettingChange: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

// ── Toggle switch ─────────────────────────────────────
function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
        checked ? "bg-[var(--accent)] border-[var(--accent)]" : "bg-[var(--bg-surface-alt)] border-[var(--border-default)]"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 mt-px ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ── Pill segmented control ─────────────────────────────
function PillGroup<T extends string | number>({
  value, options, onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg bg-[var(--bg-surface-alt)] border border-[var(--border-default)] p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-2 py-1 text-[11px] font-semibold rounded-md transition-colors duration-150 cursor-pointer ${
            value === opt.value
              ? "bg-[var(--accent)] text-white shadow-xs"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Row layout ─────────────────────────────────────────
function Row({ icon: Icon, label, desc, children }: {
  icon: typeof Languages;
  label: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[var(--border-subtle)] last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1.5 rounded-md bg-[var(--bg-surface-alt)] text-[var(--text-muted)] shrink-0">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-[var(--text-primary)]">{label}</div>
          <div className="text-[10px] text-[var(--text-muted)]">{desc}</div>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsModal({
  isOpen, onClose, theme, onToggleTheme,
  currentUser, onSignIn, onSignOut,
  settings, onSettingChange,
}: SettingsModalProps) {
  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="w-full max-w-sm rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-2xl overflow-hidden animate-pop-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
          <h2 id="settings-modal-title" className="text-sm font-bold text-[var(--text-primary)]">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-alt)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* ── Account ── */}
          <section>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Account</p>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-[var(--accent-muted)] flex items-center justify-center">
                  <UserRound className="h-4 w-4 text-[var(--accent)]" />
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {currentUser ? (currentUser.email?.split("@")[0] || currentUser.full_name || "User") : "Not signed in"}
                </span>
              </div>
              {currentUser ? (
                <button onClick={onSignOut} className="text-[11px] text-[var(--accent)] font-semibold hover:underline cursor-pointer">Sign out</button>
              ) : (
                <button onClick={onSignIn} className="text-[11px] text-[var(--accent)] font-semibold hover:underline cursor-pointer">Sign in</button>
              )}
            </div>
          </section>

          {/* ── Appearance ── */}
          <section>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Appearance</p>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-[var(--bg-surface-alt)] text-[var(--text-muted)]">
                  {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">Theme</div>
                  <div className="text-[10px] text-[var(--text-muted)] capitalize">{theme} mode</div>
                </div>
              </div>
              <PillGroup<"light" | "dark">
                value={theme}
                options={[{ label: "Light", value: "light" }, { label: "Dark", value: "dark" }]}
                onChange={(v) => { if (v !== theme) onToggleTheme(); }}
              />
            </div>
          </section>

          {/* ── Preferences ── */}
          <section>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Preferences</p>

            <Row icon={Languages} label="Auto-detect Language" desc="Identify language automatically">
              <Toggle id="s-auto-detect" checked={settings.autoDetectLanguage} onChange={(v) => onSettingChange("autoDetectLanguage", v)} />
            </Row>

            <Row icon={Copy} label="Copy on Submit" desc="Auto-copy result to clipboard">
              <Toggle id="s-copy-submit" checked={settings.copyOnSubmit} onChange={(v) => onSettingChange("copyOnSubmit", v)} />
            </Row>

            <div className="py-2.5 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-1.5 rounded-md bg-[var(--bg-surface-alt)] text-[var(--text-muted)]">
                  <Type className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">Editor Font Size</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Code textarea font size</div>
                </div>
              </div>
              <PillGroup<FontSize>
                value={settings.fontSize}
                options={[{ label: "12px", value: 12 }, { label: "14px", value: 14 }, { label: "16px", value: 16 }]}
                onChange={(v) => onSettingChange("fontSize", v)}
              />
            </div>

            <div className="py-2.5 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-1.5 rounded-md bg-[var(--bg-surface-alt)] text-[var(--text-muted)]">
                  <AlignLeft className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">Response Length</div>
                  <div className="text-[10px] text-[var(--text-muted)]">AI output verbosity</div>
                </div>
              </div>
              <PillGroup<ResponseLength>
                value={settings.responseLength}
                options={[{ label: "Short", value: "short" }, { label: "Balanced", value: "balanced" }, { label: "Detailed", value: "detailed" }]}
                onChange={(v) => onSettingChange("responseLength", v)}
              />
            </div>

            <div className="py-2.5 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-1.5 rounded-md bg-[var(--bg-surface-alt)] text-[var(--text-muted)]">
                  <ScanText className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">Output Format</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Result render format</div>
                </div>
              </div>
              <PillGroup<OutputFormat>
                value={settings.outputFormat}
                options={[{ label: "Markdown", value: "markdown" }, { label: "Plain Text", value: "plaintext" }]}
                onChange={(v) => onSettingChange("outputFormat", v)}
              />
            </div>

            <div className="py-2.5">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-1.5 rounded-md bg-[var(--bg-surface-alt)] text-[var(--text-muted)]">
                  <Maximize2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">Max Line Limit</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Lines processed per request</div>
                </div>
              </div>
              <PillGroup<MaxLines>
                value={settings.maxLines}
                options={[{ label: "500", value: 500 }, { label: "1k", value: 1000 }, { label: "2k", value: 2000 }, { label: "5k", value: 5000 }]}
                onChange={(v) => onSettingChange("maxLines", v)}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

