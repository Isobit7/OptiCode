import { useRef, useState } from "react";
import { ArrowUp, Code2, Eraser, ClipboardPaste, Languages, BookOpen, UserRound, Sparkles, Minimize2, Search, Shuffle, Command } from "lucide-react";
import type { ActionId } from "@/api/backend";
import { VoiceInputButton } from "@/components/custom/VoiceInputButton";
import { ActionPills } from "./ActionPills";

interface Props {
  code: string;
  onChange: (v: string) => void;
  language: string;
  onLanguageChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  activeAction: ActionId | null;
  onSelectAction: (actionId: ActionId) => void;
  fontSize?: 12 | 14 | 16;
}

const LANGS = [
  "auto",
  "javascript",
  "typescript",
  "python",
  "html",
  "css",
  "java",
  "c",
  "cpp",
  "csharp",
  "go",
  "rust",
  "ruby",
  "php",
  "sql",
  "bash",
];

const SLASH_COMMANDS: Array<{ id: ActionId; label: string; cmd: string; icon: typeof BookOpen; description: string }> = [
  { id: "explain", label: "Explain", cmd: "/explain", icon: BookOpen, description: "Plain-language code walkthrough" },
  { id: "humanize", label: "Humanize", cmd: "/humanize", icon: UserRound, description: "Rewrite code to feel human-authored" },
  { id: "prettify", label: "Prettify", cmd: "/prettify", icon: Sparkles, description: "Auto-format to standard language style" },
  { id: "shorten", label: "Shorten", cmd: "/shorten", icon: Minimize2, description: "Condense and minify code" },
  { id: "seo-optimize", label: "SEO Optimize", cmd: "/seo", icon: Search, description: "Improve HTML metadata & structure for SEO" },
  { id: "alternatives", label: "Alternatives", cmd: "/alternatives", icon: Shuffle, description: "Generate 2-3 alternative implementations" },
];

const ACTION_BUTTON_LABELS: Record<ActionId, string> = {
  explain: "EXPLAIN",
  humanize: "HUMANIZE",
  prettify: "PRETTIFY",
  shorten: "SHORTEN",
  "seo-optimize": "SEO OPTIMIZE",
  alternatives: "ALTERNATIVES",
};

export function CodeInputBar({
  code,
  onChange,
  language,
  onLanguageChange,
  onSubmit,
  loading,
  activeAction,
  onSelectAction,
  fontSize = 14,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Check if input is HTML to highlight/enable SEO chip
  const isHTMLSnippet = /<[a-z][\s\S]*>/i.test(code);

  const handleCodeChange = (text: string) => {
    onChange(text);

    const cursor = textareaRef.current?.selectionStart ?? text.length;
    const textBeforeCursor = text.slice(0, cursor);
    const lastSlashIdx = textBeforeCursor.lastIndexOf("/");

    if (lastSlashIdx !== -1) {
      const match = textBeforeCursor.slice(lastSlashIdx);
      if (/^\/[a-zA-Z-]*$/.test(match)) {
        setShowSlashMenu(true);
        setSlashQuery(match.toLowerCase());
        setSelectedIndex(0);
        return;
      }
    }
    setShowSlashMenu(false);
  };

  const filteredCommands = SLASH_COMMANDS.filter(
    (c) => c.cmd.startsWith(slashQuery) || c.label.toLowerCase().includes(slashQuery.replace("/", ""))
  );

  const executeSlashCommand = (cmd: (typeof SLASH_COMMANDS)[0]) => {
    const cursor = textareaRef.current?.selectionStart ?? code.length;
    const textBeforeCursor = code.slice(0, cursor);
    const lastSlashIdx = textBeforeCursor.lastIndexOf("/");

    let cleanCode = code;
    if (lastSlashIdx !== -1) {
      cleanCode = code.slice(0, lastSlashIdx) + code.slice(cursor);
    }

    onChange(cleanCode.trim());
    setShowSlashMenu(false);
    onSelectAction(cmd.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        executeSlashCommand(filteredCommands[selectedIndex]);
      } else if (e.key === "Escape") {
        setShowSlashMenu(false);
      }
    } else if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      onChange("");
      textareaRef.current?.focus();
    } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (code.trim() && !loading) {
        onSubmit();
      }
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(code ? `${code}\n${text}` : text);
      textareaRef.current?.focus();
    } catch {
      textareaRef.current?.focus();
    }
  };

  const handleSpeechResult = (speechText: string) => {
    onChange(code ? `${code}\n// Voice Note: ${speechText}` : `// Voice Note: ${speechText}`);
    textareaRef.current?.focus();
  };

  const actionButtonText = activeAction
    ? ACTION_BUTTON_LABELS[activeAction]
    : "RUN ACTION";

  const isFormDisabled = loading || !code.trim();

  return (
    <div className="relative mx-auto w-full max-w-[760px] animate-fade-in-up">
      {/* Slash Commands Floating Popover Menu */}
      {showSlashMenu && filteredCommands.length > 0 && (
        <div className="absolute -top-64 left-0 z-50 w-full max-w-md overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-2 text-[var(--text-primary)] shadow-2xl animate-pop-in">
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-3 py-2 text-xs font-bold text-[var(--accent)]">
            <Command className="h-3.5 w-3.5" />
            <span>SLASH COMMANDS</span>
            <span className="ml-auto text-[10px] font-normal text-[var(--text-muted)]">Press ↑ ↓ Enter to select</span>
          </div>

          <div className="max-h-48 overflow-y-auto py-1">
            {filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => executeSlashCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 ${
                    isSelected ? "bg-[var(--accent-muted)] text-[var(--accent)] font-semibold" : "hover:bg-[var(--bg-surface-alt)] text-[var(--text-secondary)]"
                  }`}
                >
                  <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${isSelected ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-surface-alt)] text-[var(--text-secondary)]"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{cmd.label}</span>
                      <span className="font-mono text-[10px] text-[var(--accent)]">{cmd.cmd}</span>
                    </div>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">
                      {cmd.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Composer Card Box — Compact Max Width ~760px Pinned Bottom */}
      <div className={`relative mx-auto w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-3 sm:p-3.5 shadow-sm transition-colors duration-150 focus-within:border-[var(--accent)] ${loading ? "composer-loading" : ""}`}>
        {/* Textarea Area — compact min-h 56px auto-growing */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Code input box"
          placeholder="Paste your code here or type / for AI commands..."
          rows={2}
          spellCheck={false}
          className="block w-full min-h-[56px] max-h-[220px] resize-y bg-transparent font-mono leading-relaxed outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors overflow-y-auto focus:outline-none focus:ring-0 focus-visible:ring-0 border-none p-0"
          style={{ fontSize: `${fontSize}px` }}
        />

        {/* Inline Action Selector Row */}
        <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 flex-wrap">
          <ActionPills active={activeAction} loading={loading} onSelect={onSelectAction} compact />
        </div>

        {/* Composer Controls Footer Bar */}
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3 text-[var(--text-secondary)]">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePaste}
                title="Paste from clipboard"
                aria-label="Paste code from clipboard"
                className="rounded-md p-1.5 bg-[var(--bg-surface-alt)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] min-h-[28px] min-w-[28px] flex items-center justify-center"
              >
                <ClipboardPaste className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              </button>

              <VoiceInputButton onSpeechResult={handleSpeechResult} />

              <button
                type="button"
                onClick={() => onChange("")}
                title="Clear code"
                aria-label="Clear code input"
                className="rounded-md p-1.5 bg-[var(--bg-surface-alt)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] min-h-[28px] min-w-[28px] flex items-center justify-center"
              >
                <Eraser className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>

            <div className="h-3.5 w-px bg-[var(--border-subtle)]" aria-hidden="true" />

            <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] font-mono">
              <Code2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              <span>{code.length} chars</span>
            </div>

            <div className="h-3.5 w-px bg-[var(--border-subtle)]" aria-hidden="true" />

            <label className="flex items-center gap-1 text-[11px] cursor-pointer text-[var(--text-secondary)]">
              <Languages className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              <select
                value={language}
                onChange={(e) => onLanguageChange(e.target.value)}
                aria-label="Target programming language"
                className="rounded-md bg-transparent px-1 py-0.5 text-[11px] outline-none cursor-pointer font-medium text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                {LANGS.map((l) => (
                  <option
                    key={l}
                    value={l}
                    className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                  >
                    {l === "auto" ? "Auto-detect" : l}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Primary Action Button + Cmd/Ctrl+Enter Badge */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-surface-alt)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
              Ctrl+Enter
            </span>
            <button
              type="button"
              onClick={onSubmit}
              disabled={isFormDisabled}
              aria-disabled={isFormDisabled}
              aria-label={loading ? "Processing code" : actionButtonText}
              className={[
                "inline-flex items-center gap-1.5 rounded-full py-1.5 px-4 font-bold text-xs transition-all duration-150 shadow-sm cursor-pointer select-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
                isFormDisabled
                  ? "bg-[var(--bg-surface-alt)] text-[var(--text-muted)] border border-[var(--border-subtle)] cursor-not-allowed opacity-40 shadow-none"
                  : "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white hover:scale-[1.02] active:scale-[0.96]",
              ].join(" ")}
            >
              <span className="uppercase tracking-wider font-extrabold text-[11px]">
                {loading ? "PROCESSING..." : actionButtonText}
              </span>
              <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
