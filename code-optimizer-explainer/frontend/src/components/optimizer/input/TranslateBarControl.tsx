import { ChevronDown, Languages } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface TranslateBarControlProps {
  targetLanguage: string;
  onSelectTarget: (lang: string) => void;
}

const POPULAR_LANGUAGES = [
  "TypeScript",
  "Python",
  "Rust",
  "Go",
  "C++",
  "Java",
  "C#",
  "JavaScript",
];

export function TranslateBarControl({ targetLanguage, onSelectTarget }: TranslateBarControlProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-md border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-400 transition hover:bg-orange-500/20"
        title="Change Target Language"
      >
        <Languages className="h-3.5 w-3.5 text-orange-400" />
        <span>Target: <strong>{targetLanguage}</strong></span>
        <ChevronDown className="h-3 w-3 text-orange-400/80" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-44 rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl backdrop-blur-md">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Select Target Language
          </div>
          {POPULAR_LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => {
                onSelectTarget(lang);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                targetLanguage === lang
                  ? "bg-orange-500/10 text-orange-400 font-bold"
                  : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
              }`}
            >
              <span>{lang}</span>
              {targetLanguage === lang && <span className="text-orange-400">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
