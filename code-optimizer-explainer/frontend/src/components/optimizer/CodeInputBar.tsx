import { useRef, useState, useEffect } from "react";
import { ArrowUp, Code2, Eraser, ClipboardPaste, Languages, BookOpen, UserRound, Sparkles, Minimize2, Search, Shuffle, Command } from "lucide-react";
import type { ActionId } from "@/api/backend";
import { VoiceInputButton } from "@/components/custom/VoiceInputButton";

interface Props {
  code: string;
  onChange: (v: string) => void;
  language: string;
  onLanguageChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  hasActiveAction: boolean;
  onSelectAction?: (actionId: ActionId) => void;
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

const QUICK_PROMPTS = [
  {
    label: "✦ Imagine Something...",
    prompt:
      "function calculateTotal(items) {\n  return items.reduce((acc, item) => acc + item.price, 0);\n}",
  },
  {
    label: "Analyse Data",
    prompt:
      "const processData = async (dataset) => {\n  const filtered = dataset.filter(x => x.active);\n  return filtered.map(x => ({ id: x.id, value: x.val * 2 }));\n};",
  },
  {
    label: "Create An Image Component",
    prompt:
      '<div className="card">\n  <img src="/avatar.jpg" alt="Profile" />\n  <h2>User Profile</h2>\n</div>',
  },
];

export function CodeInputBar({
  code,
  onChange,
  language,
  onLanguageChange,
  onSubmit,
  loading,
  hasActiveAction,
  onSelectAction,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Check if input ends with a slash command trigger
  const handleCodeChange = (text: string) => {
    onChange(text);

    // Detect slash command at cursor position
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
    // Remove the slash query from the code string
    const cursor = textareaRef.current?.selectionStart ?? code.length;
    const textBeforeCursor = code.slice(0, cursor);
    const lastSlashIdx = textBeforeCursor.lastIndexOf("/");

    let cleanCode = code;
    if (lastSlashIdx !== -1) {
      cleanCode = code.slice(0, lastSlashIdx) + code.slice(cursor);
    }

    onChange(cleanCode.trim());
    setShowSlashMenu(false);

    if (onSelectAction) {
      onSelectAction(cmd.id);
    }
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
    } catch {
      textareaRef.current?.focus();
    }
  };

  const handleSpeechResult = (speechText: string) => {
    onChange(code ? `${code}\n// Voice Note: ${speechText}` : `// Voice Note: ${speechText}`);
    textareaRef.current?.focus();
  };

  return (
    <div className="group relative mx-auto w-full max-w-3xl animate-fade-in-up">
      {/* Slash Commands Floating Popover Menu */}
      {showSlashMenu && filteredCommands.length > 0 && (
        <div className="absolute -top-64 left-0 z-50 w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-[#0d1017]/95 p-2 text-white shadow-2xl backdrop-blur-2xl animate-fadeIn">
          <div className="flex items-center gap-2 border-b border-zinc-800/80 px-3 py-2 text-xs font-bold text-amber-400">
            <Command className="h-3.5 w-3.5" />
            <span>SLASH COMMANDS</span>
            <span className="ml-auto text-[10px] font-normal text-zinc-500">Press ↑ ↓ Enter to select</span>
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
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition cursor-pointer ${
                    isSelected ? "bg-amber-500 text-zinc-950 font-semibold" : "hover:bg-zinc-800/60 text-zinc-200"
                  }`}
                >
                  <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${isSelected ? "bg-zinc-950 text-amber-400" : "bg-zinc-800 text-orange-400"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{cmd.label}</span>
                      <span className={`font-mono text-[10px] ${isSelected ? "text-zinc-900" : "text-amber-400"}`}>{cmd.cmd}</span>
                    </div>
                    <p className={`truncate text-[11px] ${isSelected ? "text-zinc-800" : "text-zinc-400"}`}>
                      {cmd.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Focus glow ring */}
      <div
        className="absolute -inset-0.5 rounded-[34px] opacity-0 transition-opacity duration-500 group-focus-within:opacity-100 animate-glow-pulse"
        style={{
          background:
            "linear-gradient(135deg, rgba(244,145,74,0.45) 0%, rgba(232,89,12,0.25) 50%, rgba(239,168,192,0.3) 100%)",
          filter: "blur(10px)",
        }}
      />
      <div
        className="relative mx-auto w-full max-w-3xl rounded-[24px] border p-3.5 transition-all duration-300 focus-within:shadow-[var(--glow-focus)] focus-within:scale-[1.002] sm:p-4 bg-white dark:bg-[#121215]/95 border-[#1C1C22]/12 dark:border-zinc-800/90"
        style={{
          boxShadow: "var(--shadow-float)",
        }}
      >
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste your code here or type / for AI commands (e.g. /explain, /humanize, /prettify)... ✦˚"
          rows={2}
          spellCheck={false}
          className="block w-full resize-none bg-transparent font-mono text-[14px] leading-relaxed outline-none text-[#1C1C22] dark:text-[#FAFAFA] placeholder:text-[#6B6B75] dark:placeholder:text-zinc-500 transition-colors max-h-36 overflow-y-auto"
        />

        {/* Quick Prompt Tags from msgbox.js */}
        <div className="mt-1 flex flex-wrap gap-1.5 pt-0.5">
          {QUICK_PROMPTS.map((qp) => (
            <button
              key={qp.label}
              type="button"
              onClick={() => {
                onChange(qp.prompt);
                textareaRef.current?.focus();
              }}
              className="rounded-full bg-zinc-100 dark:bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500 transition cursor-pointer border border-zinc-200 dark:border-white/10"
            >
              {qp.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 dark:border-white/10 pt-3">
          <div className="flex items-center gap-2 sm:gap-3 text-[#6B6B75] dark:text-zinc-400">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePaste}
                title="Paste from clipboard"
                className="rounded-full p-2 transition-all duration-200 hover:bg-[#1C1C22]/5 dark:hover:bg-white/10 hover:text-[#1C1C22] dark:hover:text-white hover:scale-110 active:scale-95 cursor-pointer"
              >
                <ClipboardPaste className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>

              <VoiceInputButton onSpeechResult={handleSpeechResult} />

              <button
                type="button"
                onClick={() => onChange("")}
                title="Clear"
                className="rounded-full p-2 transition-all duration-200 hover:bg-[#1C1C22]/5 dark:hover:bg-white/10 hover:text-[#1C1C22] dark:hover:text-white hover:scale-110 active:scale-95 cursor-pointer"
              >
                <Eraser className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
            </div>

            <div className="h-5 w-px bg-[#1C1C22]/15 dark:bg-white/15" aria-hidden />

            <div className="flex items-center gap-2">
              <Code2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
              <div className="hidden text-xs sm:block">
                {code.length} char{code.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="h-5 w-px bg-[#1C1C22]/15 dark:bg-white/15" aria-hidden />

            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Languages className="h-[18px] w-[18px]" strokeWidth={1.75} />
              <select
                value={language}
                onChange={(e) => onLanguageChange(e.target.value)}
                className="rounded-md bg-transparent px-1 py-1 text-xs outline-none cursor-pointer transition-colors text-[#1C1C22] dark:text-zinc-200"
              >
                {LANGS.map((l) => (
                  <option
                    key={l}
                    value={l}
                    className="bg-white dark:bg-[#121824] text-[#1C1C22] dark:text-zinc-100"
                  >
                    {l === "auto" ? "Auto-detect" : l}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || !code.trim()}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full py-2.5 px-5 font-semibold text-xs transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 shadow-lg cursor-pointer bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white hover:brightness-110"
          >
            <span className="relative z-10 font-bold uppercase tracking-wider">
              {loading ? "Processing..." : "Run Action"}
            </span>
            <ArrowUp className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
