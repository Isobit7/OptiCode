import { useState } from "react";
import { X, Languages, ArrowRight } from "lucide-react";

interface TranslateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTarget: (targetLanguage: string) => void;
}

const TARGET_LANGUAGES = [
  { name: "TypeScript", icon: "⚡" },
  { name: "Python", icon: "🐍" },
  { name: "Rust", icon: "🦀" },
  { name: "Go", icon: "🐹" },
  { name: "C++", icon: "⚙️" },
  { name: "Java", icon: "☕" },
  { name: "C#", icon: "🎯" },
  { name: "JavaScript", icon: "🌐" },
];

export function TranslateModal({ isOpen, onClose, onSelectTarget }: TranslateModalProps) {
  const [selected, setSelected] = useState("TypeScript");

  if (!isOpen) return null;

  const handleConfirm = () => {
    onSelectTarget(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 text-lg font-bold text-zinc-100">
          <Languages className="h-5 w-5 text-orange-500" />
          <span>Universal Code Translator</span>
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          Select target programming language to port your code logic into.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {TARGET_LANGUAGES.map((lang) => (
            <button
              key={lang.name}
              onClick={() => setSelected(lang.name)}
              className={`flex items-center gap-2.5 rounded-xl border p-3 text-left text-xs font-semibold transition ${
                selected === lang.name
                  ? "border-orange-500/80 bg-orange-500/10 text-orange-400 shadow-md shadow-orange-500/10"
                  : "border-zinc-800/80 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
              }`}
            >
              <span className="text-base">{lang.icon}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-500/20 transition hover:from-orange-600 hover:to-amber-600"
        >
          <span>Translate to {selected}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
