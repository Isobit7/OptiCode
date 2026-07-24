import { useRef, useState } from "react";
import { ArrowUp, ClipboardPaste, Eraser, Languages, BookOpen, UserRound, Sparkles, Minimize2, Search, Shuffle, Command } from "lucide-react";
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
}

const LANGS = [
  "auto", "javascript", "typescript", "python", "html", "css",
  "java", "c", "cpp", "csharp", "go", "rust", "ruby", "php", "sql", "bash",
];

const SLASH_COMMANDS: Array<{ id: ActionId; label: string; cmd: string; icon: typeof BookOpen; description: string }> = [
  { id: "explain", label: "Explain", cmd: "/explain", icon: BookOpen, description: "Plain-language walkthrough" },
  { id: "humanize", label: "Humanize", cmd: "/humanize", icon: UserRound, description: "Rewrite to feel human-authored" },
  { id: "prettify", label: "Prettify", cmd: "/prettify", icon: Sparkles, description: "Auto-format to standard style" },
  { id: "shorten", label: "Shorten", cmd: "/shorten", icon: Minimize2, description: "Condense and minify" },
  { id: "seo-optimize", label: "SEO Optimize", cmd: "/seo", icon: Search, description: "Improve HTML metadata" },
  { id: "alternatives", label: "Alternatives", cmd: "/alternatives", icon: Shuffle, description: "2-3 alternative implementations" },
];

export function CodeInputBar({
  code,
  onChange,
  language,
  onLanguageChange,
  onSubmit,
  loading,
  activeAction,
  onSelectAction,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

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
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(code ? `${code}\n${text}` : text);
      textareaRef.current?.focus();
    } catch { textareaRef.current?.focus(); }
  };

  const handleSpeechResult = (speechText: string) => {
    onChange(code ? `${code}\n// Voice: ${speechText}` : `// Voice: ${speechText}`);
    textareaRef.current?.focus();
  };

  return (
    <div className="relative animate-fade-in-up">
      {showSlashMenu && filteredCommands.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-50 overflow-hidden rounded-xl border bg-popover p-1.5 shadow-lg animate-scale-in">
          <div className="flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground border-b border-border mb-1">
            <Command className="h-3 w-3" />
            <span>Commands</span>
            <span className="ml-auto text-muted-foreground/60">↑↓ ↵</span>
          </div>
          {filteredCommands.map((cmd, idx) => {
            const Icon = cmd.icon;
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={cmd.id}
                type="button"
                onClick={() => executeSlashCommand(cmd)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition cursor-pointer ${
                  isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50 text-foreground"
                }`}
              >
                <div className={`p-1 rounded-md ${isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium">{cmd.label}</span>
                    <span className={`font-mono text-[10px] ${isSelected ? "text-primary" : "text-muted-foreground"}`}>{cmd.cmd}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{cmd.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border bg-card shadow-sm transition-shadow focus-within:shadow-md focus-within:border-primary/50">
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste your code here, or type / for commands..."
          rows={3}
          spellCheck={false}
          className="block w-full resize-none bg-transparent font-mono text-sm leading-relaxed outline-none text-foreground placeholder:text-muted-foreground px-4 pt-4 max-h-48 overflow-y-auto"
        />

        <div className="px-4 pb-3 flex items-center justify-between gap-2 border-t border-border mt-3 pt-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <button
              type="button"
              onClick={handlePaste}
              title="Paste"
              className="p-1.5 rounded-lg hover:bg-accent transition-colors hover:text-foreground"
            >
              <ClipboardPaste className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <VoiceInputButton onSpeechResult={handleSpeechResult} />
            <button
              type="button"
              onClick={() => onChange("")}
              title="Clear"
              className="p-1.5 rounded-lg hover:bg-accent transition-colors hover:text-foreground"
            >
              <Eraser className="h-4 w-4" strokeWidth={1.5} />
            </button>

            <div className="h-4 w-px bg-border mx-1" />

            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Languages className="h-3.5 w-3.5" strokeWidth={1.5} />
              <select
                value={language}
                onChange={(e) => onLanguageChange(e.target.value)}
                className="bg-transparent px-1 py-0.5 text-xs outline-none text-foreground cursor-pointer rounded"
              >
                {LANGS.map((l) => (
                  <option key={l} value={l}>
                    {l === "auto" ? "Auto" : l}
                  </option>
                ))}
              </select>
            </label>

            {code.length > 0 && (
              <span className="text-[10px] text-muted-foreground ml-1">
                {code.length}
              </span>
            )}
          </div>

          <ActionPills active={activeAction} loading={loading} onSelect={onSelectAction} />

          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || !code.trim()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Processing
              </span>
            ) : (
              <>
                <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
                Run
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}