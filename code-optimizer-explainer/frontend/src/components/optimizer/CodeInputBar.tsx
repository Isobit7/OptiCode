import { useRef } from "react";
import { ArrowUp, Code2, Eraser, ClipboardPaste, Languages } from "lucide-react";

import { VoiceInputButton } from "@/components/custom/VoiceInputButton";

interface Props {
  code: string;
  onChange: (v: string) => void;
  language: string;
  onLanguageChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  hasActiveAction: boolean;
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
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        className="relative mx-auto w-full max-w-3xl rounded-[32px] border p-5 transition-all duration-300 focus-within:shadow-[var(--glow-focus)] focus-within:scale-[1.005] sm:p-6 bg-white dark:bg-[#121215]/95 border-[#1C1C22]/12 dark:border-zinc-800/90"
        style={{
          boxShadow: "var(--shadow-float)",
        }}
      >
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste your code here... ✦˚"
          rows={5}
          spellCheck={false}
          className="block w-full resize-none bg-transparent font-mono text-[15px] leading-relaxed outline-none text-[#1C1C22] dark:text-[#FAFAFA] placeholder:text-[#6B6B75] dark:placeholder:text-zinc-500 transition-colors"
        />

        {/* Quick Prompt Tags from msgbox.js */}
        <div className="mt-2 flex flex-wrap gap-1.5 pt-1">
          {QUICK_PROMPTS.map((qp) => (
            <button
              key={qp.label}
              type="button"
              onClick={() => {
                onChange(qp.prompt);
                textareaRef.current?.focus();
              }}
              className="rounded-full bg-zinc-100 dark:bg-white/10 px-3 py-1 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500 transition cursor-pointer border border-zinc-200 dark:border-white/10"
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
            disabled={loading || !code.trim() || !hasActiveAction}
            title={hasActiveAction ? "Run selected action" : "Choose an action below"}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full transition-all duration-300 hover:scale-110 active:scale-90 shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            style={{ background: "var(--accent-deep)", color: "#FFFFFF" }}
          >
            {loading ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-label="Loading"
              />
            ) : (
              <ArrowUp
                className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5"
                strokeWidth={2}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
